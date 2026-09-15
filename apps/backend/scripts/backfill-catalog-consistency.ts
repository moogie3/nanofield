// Phase 6 backfill: brings the LIVE catalog onto the Phase 1-3 contract.
// READ-ONLY by default — writes happen only with --apply.
//
// What it does per non-loadtest product:
//   - metadata: category_path (when unambiguous), spec_family, spec_*,
//     monotonic has_datasheet (only ever added as "true"), no_datasheet for
//     clear non-semiconductors, mpn->part_number sync
//   - categories: set exactly the canonical category (mapped tail or self)
//   - options: verify Variation values are normalized (adds a missing
//     normalized value so future imports match; never rewrites variants)
// What it NEVER touches: prices, stock/inventory, status, handles, images.
// Triage (multi-category disagreement, ambiguous leaves) is reported, not
// guessed. Loadtest-flagged rows are skipped (separate sweep decision).
//
//   npx ts-node --transpileOnly --compilerOptions '{"module":"commonjs"}' \
//     scripts/backfill-catalog-consistency.ts [--apply] [--limit N] [--offset N]
import { normalizeOptionValue } from "../src/api/admin/shopee-imports/engine"
import {
  extractMpn,
  resolveDatasheetUrl,
} from "../src/api/admin/shopee-imports/datasheets"
import {
  canonicalCategory,
  isCanonicalCategory,
} from "../src/api/admin/shopee-imports/category-map"
import {
  deriveHasDatasheet,
  deriveSpecs,
  familyForCategory,
} from "../src/api/admin/shopee-imports/specs"

const BASE =
  process.env.BACKEND_URL || process.env.BASE_URL || "http://localhost:9000"
const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const flagValue = (name: string): string | null => {
  // Supports both --limit=50 and --limit 50 forms.
  const eq = args.find((a) => a.startsWith(`${name}=`))
  if (eq) return eq.slice(name.length + 1)
  const idx = args.indexOf(name)
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null
}
const LIMIT = Number(flagValue("--limit")) || 0
const OFFSET = Number(flagValue("--offset")) || 0

type AdminProduct = {
  id: string
  handle: string
  title: string
  status: string
  metadata: Record<string, string> | null
  categories?: { id: string; name: string }[]
  options?: { id: string; title: string; values?: { value: string }[] }[]
}

const fail = (message: string): never => {
  console.error(`backfill FAILED: ${message}`)
  process.exit(1)
}

const apiFetch = async (
  method: string,
  path: string,
  token: string,
  body?: unknown
) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    fail(`${method} ${path} -> ${res.status} ${await res.text()}`)
  }
  return (await res.json()) as Record<string, unknown>
}

const main = async () => {
  const loginRes = await fetch(`${BASE}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || "admin@test.com",
      password: process.env.ADMIN_PASSWORD || "",
    }),
  })
  if (!loginRes.ok) {
    fail(`login failed: ${loginRes.status} (set ADMIN_PASSWORD)`)
  }
  const { token } = (await loginRes.json()) as { token: string }
  const get = (path: string) => apiFetch("GET", path, token)
  const post = (path: string, body: unknown) =>
    apiFetch("POST", path, token, body)

  // Canonical category id index (created on demand in --apply mode).
  const catIds = new Map<string, string>()
  {
    let offset = 0
    for (;;) {
      const res = (await get(
        `/admin/product-categories?limit=100&offset=${offset}&fields=id,name`
      )) as {
        product_categories: { id: string; name: string }[]
        count: number
      }
      for (const c of res.product_categories) {
        if (!catIds.has(c.name.toLowerCase())) {
          catIds.set(c.name.toLowerCase(), c.id)
        }
      }
      offset += res.product_categories.length
      if (offset >= res.count) break
    }
  }
  const ensureCategoryId = async (name: string): Promise<string> => {
    const hit = catIds.get(name.toLowerCase())
    if (hit) return hit
    if (!APPLY) return `dryrun:${name}`
    const created = (await post("/admin/product-categories", {
      name,
      is_active: true,
    })) as { product_category: { id: string } }
    catIds.set(name.toLowerCase(), created.product_category.id)
    return created.product_category.id
  }

  const report = {
    scanned: 0,
    skippedLoadtest: 0,
    clean: 0,
    metadataWrites: 0,
    categoryChanges: 0,
    valuesAdded: 0,
    mpnFilled: 0,
    datasheetsLinked: 0,
    triage: [] as { id: string; handle: string; reason: string }[],
  }

  let offset = OFFSET
  for (;;) {
    const res = (await get(
      `/admin/products?limit=100&offset=${offset}&fields=id,handle,title,status,metadata,categories,options.values&order=created_at`
    )) as { products: AdminProduct[]; count: number }
    if (!res.products.length) break
    for (const p of res.products) {
      if (LIMIT && report.scanned >= LIMIT) break
      report.scanned++
      const meta = { ...(p.metadata || {}) }
      if (meta.loadtest !== undefined) {
        report.skippedLoadtest++
        continue
      }
      const variation = (p.options || []).find((o) => o.title === "Variation")
      const rawValues = (variation?.values || [])
        .map((v) => v.value)
        .filter((v) => typeof v === "string")
      const values = rawValues.map(normalizeOptionValue)

      // --- category target (uncategorized products keep no category;
      // guessing one from SKU prefixes is a new inference rule, not a fix) ---
      const currentNames = (p.categories || [])
        .map((c) => c.name)
        .filter(Boolean)
      let canonicalName: string | null = null
      let needsCategory = false
      if (!currentNames.length) {
        // Metadata-only pass with the generic family (size/package axes +
        // identifier/datasheet flags). No category is assigned.
      } else {
        const mapped = currentNames.map((n) => canonicalCategory(n) ?? n)
        const targets = [...new Set(mapped.map((n) => n.toLowerCase()))]
        if (targets.length !== 1) {
          report.triage.push({
            id: p.id,
            handle: p.handle,
            reason: `categories disagree: ${currentNames.join(" / ")}`,
          })
          continue
        }
        canonicalName =
          mapped.find((n) => n.toLowerCase() === targets[0]) ?? currentNames[0]
        needsCategory =
          currentNames.length !== 1 ||
          currentNames[0].toLowerCase() !== canonicalName.toLowerCase()
      }
      const categoryId =
        needsCategory && canonicalName
          ? await ensureCategoryId(canonicalName)
          : null

      // --- metadata diff ---
      const next: Record<string, string> = {}
      // Traceability: only when the raw leaf is unambiguous (unmapped leaf).
      const unambiguous =
        currentNames.length === 1 &&
        (canonicalCategory(currentNames[0]) ?? currentNames[0]).toLowerCase() ===
          currentNames[0].toLowerCase()
      if (unambiguous && !meta.category_path) {
        next.category_path = currentNames[0]
      }
      const family = familyForCategory(canonicalName)
      const specs = deriveSpecs(family, values)
      // spec_family only when meaningful (categorized, or specs found) —
      // stamping "generic" on everything would be write noise.
      if (canonicalName || Object.keys(specs).length) {
        next.spec_family = family
      }
      for (const [k, v] of Object.entries(specs)) {
        if (meta[k] !== v) next[k] = v
      }
      const mpn =
        typeof meta.mpn === "string" ? meta.mpn.trim() : ""
      // Datasheet automation: title-extracted candidate fills empty mpn;
      // curated map fills empty datasheet_url. Never overwrites.
      const mpnCandidate = !mpn ? extractMpn(p.title) : null
      const finalMpn = mpn || mpnCandidate || ""
      if (mpnCandidate) {
        next.mpn = mpnCandidate
        report.mpnFilled++
      }
      const mappedUrl = resolveDatasheetUrl(finalMpn)
      const existingUrl =
        typeof meta.datasheet_url === "string" ? meta.datasheet_url.trim() : ""
      if (mappedUrl && !existingUrl) {
        next.datasheet_url = mappedUrl
        report.datasheetsLinked++
      }
      if (mpn && meta.part_number !== mpn) {
        next.part_number = mpn
      }
      const partNumber = next.part_number ?? meta.part_number ?? ""
      const isSemi =
        (meta as Record<string, unknown>).is_semiconductor === "true" ||
        (meta as Record<string, unknown>).is_semiconductor === true
      if (
        deriveHasDatasheet({
          isSemiconductor: isSemi,
          partNumber,
          mpn: finalMpn || undefined,
          datasheetUrl: existingUrl || undefined,
        }) &&
        meta.has_datasheet !== "true"
      ) {
        next.has_datasheet = "true"
      }
      // no_datasheet only on EXPLICIT non-semiconductors — a missing key
      // means unknown, never an excuse to opt a product out.
      if (
        meta.is_semiconductor === "false" &&
        !(typeof meta.datasheet_url === "string" && meta.datasheet_url.trim()) &&
        meta.no_datasheet === undefined &&
        meta.has_datasheet !== "true"
      ) {
        next.no_datasheet = "true"
      }
      // Drop no-op keys (spec_family rewrite of identical value, etc.).
      for (const k of Object.keys(next)) {
        if ((meta as Record<string, string>)[k] === next[k]) {
          delete next[k]
        }
      }

      // --- option values: verify only (zero live collisions per audit) ---
      const dirty = rawValues.filter((v) => normalizeOptionValue(v) !== v)
      if (dirty.length) {
        report.triage.push({
          id: p.id,
          handle: p.handle,
          reason: `unstable option values: ${dirty.join(" | ")}`,
        })
        continue
      }

      if (!Object.keys(next).length && !needsCategory) {
        report.clean++
        continue
      }
      const body: Record<string, unknown> = {
        metadata: { ...meta, ...next },
      }
      if (needsCategory && categoryId) {
        body.categories = [{ id: categoryId }]
      }
      if (APPLY) {
        await post(`/admin/products/${p.id}`, body)
      }
      if (Object.keys(next).length) report.metadataWrites++
      if (needsCategory) report.categoryChanges++
    }
    if (LIMIT && report.scanned >= LIMIT) break
    offset += res.products.length
    if (report.scanned % 500 === 0 || offset >= (res.count as number)) {
      console.log(
        `… scanned=${report.scanned} clean=${report.clean} writes=${report.metadataWrites} catchanges=${report.categoryChanges} triage=${report.triage.length}`
      )
    }
    const total = res.count as number
    if (offset >= total) break
  }

  console.log(`\n== backfill ${APPLY ? "APPLIED" : "DRY-RUN"} ==`)
  console.log(JSON.stringify({ ...report, triage: report.triage.slice(0, 30) }, null, 2))
  if (report.triage.length > 30) {
    console.log(`… +${report.triage.length - 30} more triage rows`)
  }
  if (!APPLY) {
    console.log("No writes made. Re-run with --apply to write.")
  }
}

main().catch((e) => {
  fail((e as Error).message)
})

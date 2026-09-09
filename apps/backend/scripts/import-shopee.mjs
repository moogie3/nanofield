// Shopee Mass-Update import — thin client for the in-admin importer.
// The real implementation lives server-side in
// src/api/admin/shopee-imports/ (one implementation, used by both this CLI
// and the /app/import admin page).
//
// Usage (run from apps/backend):
//   DRY_RUN=1 node import-shopee.mjs   # preview only, no writes
//   node import-shopee.mjs             # preview, then run the import
//   PUBLISH=1 SYNC_CONTENT=1 CLEAN_DESC=1 node import-shopee.mjs
//
// Env: MEDUSA_BACKEND_URL (default http://localhost:9000),
//   ADMIN_EMAIL / ADMIN_PASSWORD,
//   FILE / BASIC_FILE / MEDIA_FILE (defaults: repo-root Shopee exports),
//   PUBLISH=1, SYNC_CONTENT=1, CLEAN_DESC=1, DRY_RUN=1
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const BASE = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const rootFile = (fallback) =>
  fileURLToPath(new URL(`../../${fallback}`, import.meta.url))
const FILES = {
  sales: process.env.FILE || rootFile("latest23-7-2026.xlsx"),
  basic:
    process.env.BASIC_FILE ||
    rootFile("mass_update_basic_info_1182502206_20260905124129.xlsx"),
  media:
    process.env.MEDIA_FILE ||
    rootFile("mass_update_media_info_1182502206_20260905124156.xlsx"),
}
const DRY_RUN = process.env.DRY_RUN === "1"
const OPTIONS = {
  publishNew: process.env.PUBLISH === "1",
  syncContent: process.env.SYNC_CONTENT === "1",
  cleanDesc: process.env.CLEAN_DESC === "1",
  dryRun: DRY_RUN,
}

const loginRes = await fetch(`${BASE}/auth/user/emailpass`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL || "admin@test.com",
    password: process.env.ADMIN_PASSWORD || "supersecret",
  }),
})
if (!loginRes.ok) {
  console.error("LOGIN FAILED:", loginRes.status, await loginRes.text())
  process.exit(1)
}
const { token } = await loginRes.json()
const H = { Authorization: `Bearer ${token}` }

const loadFiles = async () => {
  const form = new FormData()
  const names = []
  for (const [key, path] of Object.entries(FILES)) {
    try {
      const buf = await readFile(path)
      form.append(key, new Blob([buf]), path.split(/[\\/]/).pop())
      names.push(`${key}=${path}`)
    } catch (e) {
      if (key === "sales") {
        throw new Error(`cannot read sales file ${path}: ${e.message}`)
      }
      console.log(`optional file skipped (${key}): ${path}`)
    }
  }
  return { form, names }
}

const postForm = async (path, form, extra = {}) => {
  for (const [k, v] of Object.entries(extra)) {
    form.append(k, String(v))
  }
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: H,
    body: form,
  })
  const data = await r.json()
  if (!r.ok) {
    throw new Error(`${path} -> ${r.status} ${data.message || r.statusText}`)
  }
  return data
}

const { form: previewForm, names } = await loadFiles()
console.log(`files: ${names.join(", ")}`)
const { preview } = await postForm(
  "/admin/shopee-imports/preview",
  previewForm,
  { cleanDesc: OPTIONS.cleanDesc }
)
console.log("\n=== PREVIEW (no writes) ===")
console.log(
  `products=${preview.products} variants=${preview.variants} ` +
    `create=${preview.creates} update=${preview.updates} ` +
    `multi-variant=${preview.multiVariant} skipped=${preview.skipped.length}`
)
console.log(
  `with images=${preview.withImages} with descriptions=${preview.withDescriptions}`
)
if (preview.categoriesToCreate.length) {
  console.log(`categories to create: ${preview.categoriesToCreate.join(", ")}`)
}
for (const s of preview.sample) {
  console.log(`  [${s.action}] ${s.key} — ${s.name} (${s.priceRange})`)
}

if (DRY_RUN) {
  console.log("\nDRY RUN — stopping here. Re-run without DRY_RUN=1 to import.")
  process.exit(0)
}

const { form: execForm } = await loadFiles()
const { jobId } = await postForm("/admin/shopee-imports/execute", execForm, {
  publishNew: OPTIONS.publishNew,
  syncContent: OPTIONS.syncContent,
  cleanDesc: OPTIONS.cleanDesc,
  dryRun: false,
})
console.log(`\njob started: ${jobId}`)

let lastEvents = 0
for (;;) {
  await new Promise((r) => setTimeout(r, 2000))
  const r = await fetch(`${BASE}/admin/shopee-imports/jobs/${jobId}`, {
    headers: H,
  })
  const { job } = await r.json()
  for (const e of job.events.slice(lastEvents)) {
    console.log(`  ${e.message}`)
  }
  lastEvents = job.events.length
  if (job.state !== "running") {
    const rep = job.report
    console.log("\n=== IMPORT REPORT ===")
    if (rep) {
      console.log(
        `created=${rep.created} updated=${rep.updated} ` +
          `variantsAdded=${rep.variantsAdded} stockSynced=${rep.stockSynced} ` +
          `categoriesCreated=${rep.categoriesCreated}`
      )
      console.log(`skipped=${rep.skipped.length} errors=${rep.errors.length}`)
      for (const e of rep.errors.slice(0, 20)) console.log(`  ERROR ${e}`)
    }
    if (job.error) console.log(`FAILED: ${job.error}`)
    process.exit(job.state === "done" ? 0 : 1)
  }
}

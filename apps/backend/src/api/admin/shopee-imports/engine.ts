// Shared Shopee Mass-Update import engine: parsing (Informasi Penjualan +
// Dasar + Media) plus the Admin-REST upsert. Used by the
// /admin/shopee-imports API routes; the old CLI is now a thin client that
// uploads through those routes, so there is exactly one implementation.
import { MedusaError } from "@medusajs/framework/utils"
import XLSX from "xlsx"

export type ImportOptions = {
  currency?: string
  publishNew?: boolean
  syncContent?: boolean
  cleanDesc?: boolean
  concurrency?: number
}

export type ImportReport = {
  created: number
  updated: number
  variantsAdded: number
  stockSynced: number
  categoriesCreated: number
  skipped: { pid?: string; key?: string; reason: string }[]
  errors: string[]
}

export type PreviewInfo = {
  products: number
  variants: number
  multiVariant: number
  creates: number
  updates: number
  skipped: { pid?: string; reason: string }[]
  categoriesToCreate: string[]
  withDescriptions: number
  withImages: number
  sample: {
    key: string
    name: string
    variants: number
    priceRange: string
    action: "create" | "update"
  }[]
}

// --- column maps (see Shopee Mass Update templates) ---
const S = {
  PRODUCT_ID: 0,
  NAME: 1,
  VARIATION_ID: 2,
  VARIATION_NAME: 3,
  PARENT_SKU: 4,
  PRICE: 6,
  STOCK: 9,
}
const B = { PRODUCT_ID: 0, DESCRIPTION: 3 }
const M = {
  PRODUCT_ID: 0,
  CATEGORY: 3,
  COVER: 4,
  PHOTO_FIRST: 5,
  PHOTO_LAST: 12,
  VAR_FIRST_VALUE: 16,
}

type Row = (string | number | undefined)[]

const toRows = (buf: Buffer): Row[] => {
  const wb = XLSX.read(buf, { type: "buffer" })
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    blankrows: false,
  }) as Row[]
}

const str = (v: string | number | undefined): string =>
  String(v ?? "").trim()

const isHttp = (u: string | number | undefined): boolean =>
  /^https?:\/\//i.test(str(u))

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product"

export type SalesRow = {
  pid: string
  name: string
  variationId: string
  variationName: string
  parentSku: string
  price: number | null
  stock: number
}

export const parseSales = (buf: Buffer): SalesRow[] => {
  return toRows(buf)
    .filter((r) => /^\d+$/.test(str(r[S.PRODUCT_ID])))
    .map((r) => {
      const price = Math.round(Number(r[S.PRICE]))
      return {
        pid: str(r[S.PRODUCT_ID]),
        name: str(r[S.NAME]),
        variationId: str(r[S.VARIATION_ID]),
        variationName: str(r[S.VARIATION_NAME]),
        parentSku: str(r[S.PARENT_SKU]),
        price: Number.isFinite(price) && price >= 0 ? price : null,
        stock: Math.max(0, parseInt(str(r[S.STOCK]) || "0", 10) || 0),
      }
    })
}

export const parseBasic = (buf: Buffer | undefined): Map<string, string> => {
  const map = new Map<string, string>()
  if (!buf) {
    return map
  }
  for (const r of toRows(buf)) {
    if (!/^\d+$/.test(str(r[B.PRODUCT_ID]))) {
      continue
    }
    map.set(str(r[B.PRODUCT_ID]), String(r[B.DESCRIPTION] ?? ""))
  }
  return map
}

export type MediaEntry = {
  category: string | null
  categoryPath: string
  images: string[]
}

const GENERIC_LEAVES = new Set(["others", "other", "lainnya", "lain-lain"])

const leafCategory = (path: string): string | null => {
  const parts = path
    .replace(/^\d+\s*-\s*/, "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
  if (!parts.length) {
    return null
  }
  const leaf = parts[parts.length - 1]
  if (GENERIC_LEAVES.has(leaf.toLowerCase()) && parts.length > 1) {
    return `${parts[parts.length - 2]} ${leaf}`
  }
  return leaf
}

export const parseMedia = (buf: Buffer | undefined): Map<string, MediaEntry> => {
  const map = new Map<string, MediaEntry>()
  if (!buf) {
    return map
  }
  for (const r of toRows(buf)) {
    if (!/^\d+$/.test(str(r[M.PRODUCT_ID]))) {
      continue
    }
    const images: string[] = []
    for (let c = M.COVER; c <= M.PHOTO_LAST; c++) {
      const u = str(r[c])
      if (isHttp(u) && !images.includes(u)) {
        images.push(u)
      }
    }
    for (let n = 0; n < 10; n++) {
      const img = str(r[M.VAR_FIRST_VALUE + n * 2 + 1])
      if (isHttp(img) && !images.includes(img)) {
        images.push(img)
      }
    }
    map.set(str(r[M.PRODUCT_ID]), {
      category: leafCategory(str(r[M.CATEGORY])),
      categoryPath: str(r[M.CATEGORY]),
      images,
    })
  }
  return map
}

// Hashtag-spam cleanup ("... #transistor #ic ..."): keeps prose, drops
// pure hashtag noise. Only applied with the cleanDesc option.
export const cleanDescription = (raw: string): string => {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) =>
      l
        .replace(/#[\p{L}\p{N}_]+/gu, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter((l) => l.length > 0)
    .join("\n\n")
}

export type VariantPlan = {
  shopeeVariationId: string
  title: string
  optionValue: string
  sku: string
  price: number
  stock: number
}

export type ProductPlan = {
  pid: string
  name: string
  key: string
  handle: string
  variants: VariantPlan[]
  description: string
  category: string | null
  images: string[]
}

export const buildPlans = (
  sales: SalesRow[],
  descriptions: Map<string, string>,
  media: Map<string, MediaEntry>,
  cleanDesc: boolean
): { plans: ProductPlan[]; skipped: { pid: string; reason: string }[] } => {
  const groups = new Map<string, SalesRow[]>()
  for (const r of sales) {
    if (!groups.has(r.pid)) {
      groups.set(r.pid, [])
    }
    groups.get(r.pid)!.push(r)
  }

  const plans: ProductPlan[] = []
  const skipped: { pid: string; reason: string }[] = []
  for (const [pid, vrows] of groups) {
    const name = vrows[0].name
    const parentSku = vrows.find((r) => r.parentSku)?.parentSku || ""
    if (!name) {
      skipped.push({ pid, reason: "empty product name" })
      continue
    }
    const key = parentSku || `shopee-${pid}`
    const variants: VariantPlan[] = []
    let badPrice = 0
    vrows.forEach((r, i) => {
      if (r.price === null) {
        badPrice++
        return
      }
      const label = r.variationName || "Default"
      variants.push({
        shopeeVariationId: r.variationId,
        title: label,
        optionValue: label,
        sku:
          vrows.length === 1 && parentSku
            ? parentSku
            : `${parentSku || `shopee-${pid}`}-${i + 1}`,
        price: r.price,
        stock: r.stock,
      })
    })
    if (badPrice) {
      skipped.push({ pid, reason: `invalid price on ${badPrice} row(s)` })
      continue
    }
    const rawDesc = descriptions.get(pid) || ""
    const m = media.get(pid)
    plans.push({
      pid,
      name,
      key,
      handle: slugify(key),
      variants,
      description: rawDesc ? (cleanDesc ? cleanDescription(rawDesc) : rawDesc) : "",
      category: m?.category || null,
      images: m?.images || [],
    })
  }
  return { plans, skipped }
}

// --- HTTP plumbing (Admin REST, caller-supplied auth headers) ---

type FetchHeaders = Record<string, string>

const apiFetch = async (
  baseUrl: string,
  headers: FetchHeaders,
  method: string,
  path: string,
  body?: unknown
) => {
  const r = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...headers, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${method} ${path} -> ${r.status} ${await r.text()}`
    )
  }
  return r.status === 204 ? null : ((await r.json()) as Record<string, unknown>)
}

export type RunOptions = {
  baseUrl: string
  headers: FetchHeaders
  plans: ProductPlan[]
  skipped: { pid: string; reason: string }[]
  currency?: string
  publishNew?: boolean
  syncContent?: boolean
  dryRun?: boolean
  concurrency?: number
  onEvent?: (message: string) => void
}

export const runImport = async (opts: RunOptions): Promise<ImportReport> => {
  const currency = (opts.currency || "idr").toLowerCase()
  const concurrency = opts.concurrency || 4
  const dryRun = !!opts.dryRun
  const emit = (m: string) => opts.onEvent?.(m)
  const get = (path: string) => apiFetch(opts.baseUrl, opts.headers, "GET", path)
  const post = (path: string, body: unknown) =>
    apiFetch(opts.baseUrl, opts.headers, "POST", path, body)

  const report: ImportReport = {
    created: 0,
    updated: 0,
    variantsAdded: 0,
    stockSynced: 0,
    categoriesCreated: 0,
    skipped: [...opts.skipped],
    errors: [],
  }

  // Setup: channel / location / shipping profile.
  const channelId = (
    (await get("/admin/sales-channels?limit=10")) as {
      sales_channels: { id: string }[]
    }
  ).sales_channels[0].id
  const locationId = (
    (await get("/admin/stock-locations?limit=10")) as {
      stock_locations: { id: string }[]
    }
  ).stock_locations[0].id
  const shippingProfileId = (
    (await get("/admin/shipping-profiles?limit=10")) as {
      shipping_profiles: { id: string }[]
    }
  ).shipping_profiles[0].id
  emit(`channel=${channelId} location=${locationId}`)

  // Store currency + Indonesia region.
  const { stores } = (await get("/admin/stores?limit=10")) as {
    stores: {
      id: string
      supported_currencies: { currency_code: string; is_default: boolean }[]
    }[]
  }
  const store = stores[0]
  if (!store.supported_currencies.some((c) => c.currency_code === currency)) {
    emit(`store lacks ${currency}, adding to supported currencies`)
    if (!dryRun) {
      await post(`/admin/stores/${store.id}`, {
        supported_currencies: [
          ...store.supported_currencies.map((c) => ({
            currency_code: c.currency_code,
            is_default: !!c.is_default,
          })),
          { currency_code: currency, is_default: false },
        ],
      })
    }
  }
  const { regions } = (await get("/admin/regions?limit=100")) as {
    regions: { id: string; name: string; currency_code: string; countries: { iso_2: string }[] }[]
  }
  const regionOk = regions.find(
    (r) =>
      r.currency_code === currency &&
      (r.countries || []).some((c) => (c.iso_2 || "").toLowerCase() === "id")
  )
  if (regionOk) {
    emit(`region ok: ${regionOk.name}`)
  } else {
    emit("no Indonesia/IDR region, creating one")
    if (!dryRun) {
      try {
        await post("/admin/regions", {
          name: "Indonesia",
          currency_code: currency,
          countries: ["id"],
          payment_providers: ["pp_system_default"],
        })
      } catch (e) {
        emit(
          `REGION CREATE FAILED (prices still import): ${(e as Error).message}`
        )
      }
    }
  }

  // Index existing products.
  type ExistingProduct = {
    id: string
    handle: string
    metadata: Record<string, string> | null
  }
  const existingByShopeeId = new Map<string, ExistingProduct>()
  const existingHandles = new Set<string>()
  {
    let offset = 0
    const limit = 100
    for (;;) {
      const res = (await get(
        `/admin/products?limit=${limit}&offset=${offset}&fields=id,handle,metadata,variants.id,variants.sku`
      )) as {
        products: { id: string; handle: string; metadata: Record<string, string> | null }[]
        count: number
      }
      for (const p of res.products) {
        existingHandles.add(p.handle)
        if (p.metadata?.shopee_product_id) {
          existingByShopeeId.set(String(p.metadata.shopee_product_id), {
            id: p.id,
            handle: p.handle,
            metadata: p.metadata,
          })
        }
      }
      offset += res.products.length
      if (offset >= res.count) {
        break
      }
    }
  }
  emit(`indexed ${existingHandles.size} existing products`)

  // Index + ensure categories.
  const categoryCache = new Map<string, string>()
  {
    let offset = 0
    const limit = 100
    for (;;) {
      const res = (await get(
        `/admin/product-categories?limit=${limit}&offset=${offset}`
      )) as { product_categories: { id: string; name: string }[]; count: number }
      for (const c of res.product_categories) {
        categoryCache.set(c.name.toLowerCase(), c.id)
      }
      offset += res.product_categories.length
      if (offset >= res.count) {
        break
      }
    }
  }
  const catsBefore = categoryCache.size
  const ensureCategory = async (name: string | null): Promise<string | null> => {
    if (!name) {
      return null
    }
    const hit = categoryCache.get(name.toLowerCase())
    if (hit) {
      return hit
    }
    if (dryRun) {
      return null
    }
    const created = (await post("/admin/product-categories", {
      name,
      is_active: true,
    })) as { product_category: { id: string } }
    categoryCache.set(name.toLowerCase(), created.product_category.id)
    return created.product_category.id
  }

  const findInventoryItemId = async (sku: string): Promise<string | null> => {
    const res = (await get(
      `/admin/inventory-items?q=${encodeURIComponent(sku)}`
    )) as { inventory_items: { id: string; sku: string }[] }
    const hit = (res.inventory_items || []).find((i) => i.sku === sku)
    return hit?.id || res.inventory_items?.[0]?.id || null
  }

  const syncStock = async (inventoryItemId: string | null, stock: number) => {
    if (!inventoryItemId) {
      return
    }
    const { inventory_levels } = (await get(
      `/admin/inventory-items/${inventoryItemId}/location-levels`
    )) as {
      inventory_levels: { id: string; location_id: string; stocked_quantity: number }[]
    }
    const existing = (inventory_levels || []).find(
      (l) => l.location_id === locationId
    )
    if (existing) {
      if (existing.stocked_quantity !== stock) {
        report.stockSynced++
        if (!dryRun) {
          await post("/admin/inventory-items/location-levels/batch", {
            update: [{ id: existing.id, stocked_quantity: stock }],
          })
        }
      }
    } else {
      report.stockSynced++
      if (!dryRun) {
        await post("/admin/inventory-items/location-levels/batch", {
          create: [
            {
              inventory_item_id: inventoryItemId,
              location_id: locationId,
              stocked_quantity: stock,
            },
          ],
        })
      }
    }
  }

  const mergePrice = (
    prices: { id?: string; currency_code: string; amount: number }[],
    amount: number
  ) => {
    const rest = (prices || []).map((p) => ({
      id: p.id,
      currency_code: p.currency_code,
      amount: p.amount,
    }))
    const idx = rest.findIndex((p) => p.currency_code === currency)
    if (idx >= 0) {
      rest[idx] = { ...rest[idx], amount }
    } else {
      rest.push({ currency_code: currency, amount })
    }
    return rest
  }

  const samePrices = (
    a: { currency_code: string; amount: number }[],
    b: { currency_code: string; amount: number }[]
  ) =>
    JSON.stringify(a.map((p) => [p.currency_code, p.amount]).sort()) ===
    JSON.stringify(b.map((p) => [p.currency_code, p.amount]).sort())

  const upsertOne = async (plan: ProductPlan) => {
    const existing = existingByShopeeId.get(plan.pid)
    const categoryId = await ensureCategory(plan.category)
    const imagePayload = plan.images.map((url) => ({ url }))

    if (!existing) {
      let handle = plan.handle
      if (existingHandles.has(handle)) {
        handle = `${plan.handle}-${plan.pid}`
      }
      if (dryRun) {
        report.created++
        return
      }
      const multi = plan.variants.length > 1
      const res = (await post("/admin/products", {
        title: plan.name,
        handle,
        description: plan.description || undefined,
        status: opts.publishNew ? "published" : "draft",
        discountable: true,
        metadata: {
          shopee_product_id: plan.pid,
          shopee_parent_sku: plan.key,
        },
        categories: categoryId ? [{ id: categoryId }] : undefined,
        images: imagePayload.length ? imagePayload : undefined,
        sales_channels: [{ id: channelId }],
        shipping_profile_id: shippingProfileId,
        options: [
          {
            title: "Variation",
            values: multi
              ? [...new Set(plan.variants.map((v) => v.optionValue))]
              : ["Default"],
          },
        ],
        variants: plan.variants.map((v) => ({
          title: v.title,
          sku: v.sku,
          manage_inventory: true,
          options: { Variation: v.optionValue },
          prices: [{ currency_code: currency, amount: v.price }],
          metadata: { shopee_variation_id: v.shopeeVariationId },
        })),
      })) as { product: { id: string; handle: string } }
      existingHandles.add(handle)
      existingByShopeeId.set(plan.pid, {
        id: res.product.id,
        handle,
        metadata: {
          shopee_product_id: plan.pid,
          shopee_parent_sku: plan.key,
        },
      })
      report.created++
      for (const v of plan.variants) {
        await syncStock(await findInventoryItemId(v.sku), v.stock)
      }
      return
    }

    report.updated++
    const body: Record<string, unknown> = {
      title: plan.name,
      metadata: {
        ...((existing.metadata as Record<string, string>) || {}),
        shopee_product_id: plan.pid,
        shopee_parent_sku: plan.key,
      },
    }
    if (opts.syncContent) {
      const fresh = (await get(
        `/admin/products/${existing.id}?fields=id,description,*images,*categories`
      )) as {
        product: {
          description: string | null
          images: { url: string }[]
          categories: { id: string }[]
        }
      }
      const cur = fresh.product
      if (plan.description && cur.description !== plan.description) {
        body.description = plan.description
      }
      const curUrls = (cur.images || []).map((i) => i.url)
      if (
        imagePayload.length > 0 &&
        (curUrls.length === 0 ||
          imagePayload.some((i) => !curUrls.includes(i.url)))
      ) {
        body.images = imagePayload
      }
      const curCatIds = (cur.categories || []).map((c) => c.id)
      if (categoryId && !curCatIds.includes(categoryId)) {
        body.categories = [{ id: categoryId }]
      }
    }
    if (!dryRun) {
      await post(`/admin/products/${existing.id}`, body)
    }

    const detail = (await get(
      `/admin/products/${existing.id}?fields=id,options.id,options.title,options.values`
    )) as {
      product: {
        options: { id: string; title: string; values: { value: string }[] }[]
      }
    }
    let variationOption = (detail.product.options || []).find(
      (o) => o.title === "Variation"
    )
    if (!variationOption && !dryRun) {
      const created = (await post(
        `/admin/products/${existing.id}/options`,
        { title: "Variation", values: ["Default"] }
      )) as { product_option: { id: string; values: { value: string }[] } }
      variationOption = { id: created.product_option.id, title: "Variation", values: [] }
    }
    const knownValues = new Set(
      (variationOption?.values || []).map((v) => v.value)
    )

    const freshV = (await get(
      `/admin/products/${existing.id}?fields=id,variants.id,variants.sku,variants.metadata`
    )) as {
      product: { variants: { id: string; sku: string }[] }
    }
    const bySku = new Map((freshV.product.variants || []).map((v) => [v.sku, v]))
    for (const v of plan.variants) {
      const hit = bySku.get(v.sku)
      if (!hit) {
        if (!knownValues.has(v.optionValue) && !dryRun && variationOption) {
          await post(
            `/admin/products/${existing.id}/options/${variationOption.id}/values`,
            { value: v.optionValue }
          )
          knownValues.add(v.optionValue)
        }
        report.variantsAdded++
        if (dryRun) {
          continue
        }
        await post(`/admin/products/${existing.id}/variants`, {
          title: v.title,
          sku: v.sku,
          manage_inventory: true,
          options: { Variation: v.optionValue },
          prices: [{ currency_code: currency, amount: v.price }],
          metadata: { shopee_variation_id: v.shopeeVariationId },
        })
        await syncStock(await findInventoryItemId(v.sku), v.stock)
        continue
      }
      const full = (await get(
        `/admin/products/${existing.id}/variants/${hit.id}`
      )) as {
        variant: {
          prices: { id: string; currency_code: string; amount: number }[]
        }
      }
      const merged = mergePrice(full.variant.prices, v.price)
      if (!samePrices(full.variant.prices || [], merged) && !dryRun) {
        await post(`/admin/products/${existing.id}/variants/${hit.id}`, {
          prices: merged,
        })
      }
      await syncStock(await findInventoryItemId(v.sku), v.stock)
    }
  }

  let i = 0
  let lastLogged = 0
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < opts.plans.length) {
      const item = opts.plans[i++]
      try {
        await upsertOne(item)
      } catch (e) {
        report.errors.push(`${item.key}: ${(e as Error).message}`)
      }
      const done = report.created + report.updated
      if (done - lastLogged >= 50) {
        lastLogged = done
        emit(`progress: created=${report.created} updated=${report.updated} errors=${report.errors.length}`)
      }
    }
  })
  await Promise.all(workers)
  report.categoriesCreated = categoryCache.size - catsBefore
  return report
}

export type PreviewInput = {
  baseUrl: string
  headers: FetchHeaders
  salesBuf: Buffer
  basicBuf?: Buffer
  mediaBuf?: Buffer
  cleanDesc?: boolean
}

// Preview = full parse + plan + live index, no writes. Shared by the
// preview endpoint and dry-run mode.
export const buildPreview = async (input: PreviewInput): Promise<PreviewInfo> => {
  const sales = parseSales(input.salesBuf)
  const descriptions = parseBasic(input.basicBuf)
  const media = parseMedia(input.mediaBuf)
  const { plans, skipped } = buildPlans(
    sales,
    descriptions,
    media,
    !!input.cleanDesc
  )

  const get = (path: string) =>
    apiFetch(input.baseUrl, input.headers, "GET", path)

  const matched = new Set<string>()
  {
    let offset = 0
    const limit = 100
    for (;;) {
      const res = (await get(
        `/admin/products?limit=${limit}&offset=${offset}&fields=id,metadata`
      )) as {
        products: { id: string; metadata: Record<string, string> | null }[]
        count: number
      }
      for (const p of res.products) {
        if (p.metadata?.shopee_product_id) {
          matched.add(String(p.metadata.shopee_product_id))
        }
      }
      offset += res.products.length
      if (offset >= res.count) {
        break
      }
    }
  }

  const knownCats = new Set<string>()
  {
    let offset = 0
    const limit = 100
    for (;;) {
      const res = (await get(
        `/admin/product-categories?limit=${limit}&offset=${offset}`
      )) as { product_categories: { name: string }[]; count: number }
      for (const c of res.product_categories) {
        knownCats.add(c.name.toLowerCase())
      }
      offset += res.product_categories.length
      if (offset >= res.count) {
        break
      }
    }
  }
  const categoriesToCreate = [
    ...new Set(
      plans
        .map((p) => p.category)
        .filter((c): c is string => !!c && !knownCats.has(c.toLowerCase()))
    ),
  ].sort()

  const priceRange = (p: ProductPlan) => {
    const prices = p.variants.map((v) => v.price)
    return prices.length > 1
      ? `${Math.min(...prices)}–${Math.max(...prices)}`
      : `${prices[0]}`
  }

  return {
    products: plans.length,
    variants: plans.reduce((n, p) => n + p.variants.length, 0),
    multiVariant: plans.filter((p) => p.variants.length > 1).length,
    creates: plans.filter((p) => !matched.has(p.pid)).length,
    updates: plans.filter((p) => matched.has(p.pid)).length,
    skipped,
    categoriesToCreate,
    withDescriptions: plans.filter((p) => p.description.length > 0).length,
    withImages: plans.filter((p) => p.images.length > 0).length,
    sample: plans.slice(0, 8).map((p) => ({
      key: p.key,
      name: p.name,
      variants: p.variants.length,
      priceRange: priceRange(p),
      action: (matched.has(p.pid) ? "update" : "create") as "update" | "create",
    })),
  }
}

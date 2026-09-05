// Bulk load-test seeder for Nanofield storefront testing.
// Usage:
//   COUNT=1200 CONCURRENCY=8 node seed-bulk.mjs        # create COUNT products
//   CLEAN=1 node seed-bulk.mjs                          # delete all lt-* products
// Handles are lt-0001..lt-N so test data is trivially distinguishable
// from the real catalog and removable via CLEAN=1.
const BASE = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const COUNT = parseInt(process.env.COUNT || "1000", 10)
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "8", 10)
const CLEAN = process.env.CLEAN === "1"

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
const H = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
}

const api = async (method, path, body) => {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok)
    throw new Error(`${method} ${path} -> ${r.status} ${await r.text()}`)
  return r.status === 204 ? null : r.json()
}
const get = (path) => api("GET", path)

const channels = await get("/admin/sales-channels?limit=10")
const channelId = channels.sales_channels[0].id
const locations = await get("/admin/stock-locations?limit=10")
const locationId = locations.stock_locations[0].id
const profiles = await get("/admin/shipping-profiles?limit=10")
const shippingProfileId = profiles.shipping_profiles[0].id

const existingCats = await get("/admin/product-categories?limit=100")
const catByName = Object.fromEntries(
  existingCats.product_categories.map((c) => [c.name, c.id])
)

// --- deterministic part families (prefix, title base, category, makers, pkgs)
const MFRS = [
  "Texas Instruments",
  "STMicroelectronics",
  "ON Semiconductor",
  "Infineon",
  "Vishay",
  "Murata",
  "Yageo",
  "Nichicon",
  "Nexperia",
  "Diodes Inc",
]
const FAMILIES = [
  { p: "IC", base: "Logic IC 74HC series", cat: "Integrated Circuits", pkg: ["DIP-14", "SOIC-14", "TSSOP-14"] },
  { p: "IC", base: "Op-Amp precision", cat: "Integrated Circuits", pkg: ["DIP-8", "SOIC-8"] },
  { p: "IC", base: "Voltage regulator", cat: "Integrated Circuits", pkg: ["TO-220", "SOT-223"] },
  { p: "IC", base: "Microcontroller", cat: "Integrated Circuits", pkg: ["TQFP-32", "QFN-48"] },
  { p: "TRS", base: "NPN transistor", cat: "Transistors", pkg: ["TO-92", "SOT-23"] },
  { p: "TRS", base: "PNP transistor", cat: "Transistors", pkg: ["TO-92", "SOT-23"] },
  { p: "MOS", base: "Power MOSFET N-Channel", cat: "MOSFETs", pkg: ["TO-220", "DPAK"] },
  { p: "MOS", base: "Power MOSFET P-Channel", cat: "MOSFETs", pkg: ["TO-220", "DPAK"] },
  { p: "CAP", base: "Ceramic capacitor", cat: "Capacitors", pkg: ["0805", "1206"] },
  { p: "CAP", base: "Electrolytic capacitor", cat: "Capacitors", pkg: ["Radial 8x12mm", "Radial 10x16mm"] },
  { p: "RES", base: "Thick-film resistor 1%", cat: "Resistors", pkg: ["0805", "1206"] },
  { p: "DIO", base: "Rectifier diode", cat: "Diodes & Rectifiers", pkg: ["DO-41", "SMA"] },
  { p: "DIO", base: "Schottky diode", cat: "Diodes & Rectifiers", pkg: ["SMA", "SMB"] },
  { p: "MOD", base: "Sensor module", cat: "Modules & Boards", pkg: ["Module 4-pin", "SMD Module"] },
  { p: "MOD", base: "Display module", cat: "Modules & Boards", pkg: ["Module 4-pin", "Module 8-pin"] },
]

const pad = (n, w = 4) => String(n).padStart(w, "0")

// Real manufacturer part names (index-aligned with FAMILIES) so datasheet
// search links resolve to genuine parts, e.g. TIP41C.
const MPN_POOL = [
  "74HC00N",
  "LM358P",
  "LM7805T",
  "ATMEGA328P-PU",
  "TIP41C",
  "BC557B",
  "IRF540NPBF",
  "IRF9540NPBF",
  "CL10B104KB8NNNC",
  "EEE-FT1E471AP",
  "RC0805FR-0710KL",
  "1N4007-T",
  "SS14-E3",
  "DHT22-AM2302",
  "SSD1306-OLED-096",
]

const buildPart = (i) => {
  const fam = FAMILIES[i % FAMILIES.length]
  const sku = `${fam.p}-9${pad(i, 4)}`
  const pkg = fam.pkg[i % fam.pkg.length]
  const mfr = MFRS[i % MFRS.length]
  // Every 4th part stays single-variant; the rest get 2-4 package variants.
  const variantPkgs =
    i % 4 === 3
      ? [pkg]
      : [...new Set([pkg, ...fam.pkg])].slice(0, 2 + (i % 3))
  const price = 100 + ((i * 137) % 4900)
  const stock = 50 + ((i * 53) % 500)
  return {
    handle: `lt-${pad(i + 1)}`,
    title: `Loadtest ${fam.base} ${sku}`,
    sku,
    cat: fam.cat,
    mfr,
    pkg,
    price,
    stock,
    mpn: MPN_POOL[i % MPN_POOL.length],
    variants: variantPkgs.map((vpkg, vi) => ({
      title: vpkg,
      sku: `${sku}-${"ABCDEFGH"[vi]}`,
      price: Math.round(price * (1 + vi * 0.12)),
      stock: Math.max(10, Math.round(stock / variantPkgs.length)),
      pkg: vpkg,
      options: { Package: vpkg },
    })),
  }
}

// --- fetch all existing lt-* handles (paginated)
const existingHandles = new Set()
{
  let offset = 0
  for (;;) {
    const res = await get(
      `/admin/products?limit=100&offset=${offset}&fields=handle`
    )
    if (!res.products.length) break
    for (const p of res.products) existingHandles.add(p.handle)
    offset += res.products.length
    if (offset >= res.count) break
  }
  console.log(`existing products in backend: ${existingHandles.size}`)
}

if (CLEAN) {
  const doomed = [...existingHandles].filter((h) => h.startsWith("lt-"))
  console.log(`deleting ${doomed.length} load-test products...`)
  const ids = []
  {
    let offset = 0
    for (;;) {
      const res = await get(
        `/admin/products?limit=100&offset=${offset}&fields=id,handle`
      )
      if (!res.products.length) break
      for (const p of res.products)
        if (p.handle.startsWith("lt-")) ids.push(p.id)
      offset += res.products.length
      if (offset >= res.count) break
    }
  }
  let deleted = 0
  const workers = Array.from(
    { length: CONCURRENCY },
    async () => {
      for (;;) {
        const id = ids.pop()
        if (!id) return
        await api("DELETE", `/admin/products/${id}`)
        deleted++
        if (deleted % 100 === 0) console.log(`  deleted ${deleted}/${ids.length + deleted}`)
      }
    }
  )
  await Promise.all(workers)
  console.log(`DONE. deleted ${deleted} products.`)
  process.exit(0)
}

// --- create with a worker pool
const queue = []
for (let i = 0; i < COUNT; i++) {
  const part = buildPart(i)
  if (!existingHandles.has(part.handle)) queue.push(part)
}
console.log(
  `creating ${queue.length} products (${COUNT - queue.length} already exist), concurrency=${CONCURRENCY}`
)

let created = 0
let failed = 0
const t0 = Date.now()
const workers = Array.from({ length: CONCURRENCY }, async () => {
  for (;;) {
    const part = queue.pop()
    if (!part) return
    try {
      const res = await api("POST", "/admin/products", {
        title: part.title,
        handle: part.handle,
        description: `${part.title} by ${part.mfr}. Load-test data, not real stock.`,
        status: "published",
        discountable: true,
        metadata: {
          part_number: part.sku,
          mpn: part.mpn,
          manufacturer: part.mfr,
          package_case: part.pkg,
          is_semiconductor: true,
          loadtest: "true",
          // Modules/boards carry no datasheet UI (same rule as hand tools):
          // distributor/datasheet links only make sense for semiconductors.
          ...(part.cat === "Modules & Boards"
            ? { no_datasheet: "true" }
            : {}),
        },
        categories: [{ id: catByName[part.cat] }],
        sales_channels: [{ id: channelId }],
        shipping_profile_id: shippingProfileId,
        options: [
          {
            title: "Package",
            values: part.variants.map((v) => v.pkg),
          },
        ],
        variants: part.variants.map((v) => ({
          title: v.title,
          sku: v.sku,
          manage_inventory: true,
          options: v.options,
          prices: [{ amount: v.price, currency_code: "eur" }],
        })),
      })
      for (let vi = 0; vi < res.product.variants.length; vi++) {
        const variant = res.product.variants[vi]
        const invItemId =
          variant?.inventory_items?.[0]?.inventory_item_id ||
          (
            await get(
              `/admin/inventory-items?q=${part.variants[vi].sku}`
            )
          ).inventory_items[0]?.id
        if (invItemId) {
          await api(
            "POST",
            `/admin/inventory-items/${invItemId}/location-levels`,
            {
              location_id: locationId,
              stocked_quantity: part.variants[vi].stock,
            }
          )
        }
      }
      created++
      if (created % 100 === 0) {
        const s = ((Date.now() - t0) / 1000).toFixed(0)
        console.log(`  created ${created}/${created + queue.length} (${s}s)`)
      }
    } catch (e) {
      failed++
      console.error(`FAILED ${part.handle}:`, e.message.slice(0, 200))
    }
  }
})
await Promise.all(workers)
const secs = ((Date.now() - t0) / 1000).toFixed(0)
console.log(`DONE. created=${created} failed=${failed} in ${secs}s`)
console.log(`Cleanup when finished testing: CLEAN=1 node seed-bulk.mjs`)

// Idempotent Nanofield commerce setup seeder (backend shipping foundation).
//
// Ensures, in dependency order, everything checkout needs except the product
// catalog itself: IDR store currency, Indonesia/IDR region, `id` tax region,
// Pasar Jambi stock location, sales-channel link, fulfillment-provider links,
// fulfillment set + service zone + `id` geo-zone, Standard option type,
// the jne-ctc service enabled, and the three calculated shipping options
// (JNE REG, J&T Express, JNE City Courier) on the rajaongkir provider.
//
// Safe to re-run: every step checks current state first and skips what
// already exists. Nothing is ever deleted.
//
// Usage (backend must be running):
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node seed-nanofield-shipping.mjs
//   DRY_RUN=1 ADMIN_EMAIL=... ADMIN_PASSWORD=... node seed-nanofield-shipping.mjs
//     -> report only, no writes.
//
// Matches the working state documented in whole.md and the procedure in
// STARTING_MANUAL.md (Part F). Manual setup and this script never conflict:
// existing matching records are reused, never duplicated.
const BASE = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const DRY_RUN = process.env.DRY_RUN === "1"

const LOCATION_NAME = process.env.LOCATION_NAME || "Pasar Jambi"
const CHANNEL_NAME = process.env.CHANNEL_NAME || "Default Sales Channel"
const ADDRESS = {
  address_1: process.env.LOCATION_ADDRESS_1 || "Jalan Sam Ratulangi",
  city: process.env.LOCATION_CITY || "Jambi",
  country_code: (process.env.LOCATION_COUNTRY || "id").toLowerCase(),
  province: process.env.LOCATION_PROVINCE || "Jambi",
  postal_code: process.env.LOCATION_POSTAL || "36133",
}
const SET_NAME = "Pasar Jambi shipping"
const ZONE_NAME = "Pasar Jambi"
const PROVIDERS = ["manual_manual", "rajaongkir_rajaongkir"]
const OPTIONS = [
  {
    name: "JNE REG",
    data: { id: "jne-reg", courier: "jne", service: "REG" },
  },
  {
    name: "J&T Express",
    data: { id: "jnt-eco", courier: "jnt", service: "EZ" },
  },
  {
    name: "JNE City Courier",
    data: { id: "jne-ctc", courier: "jne", service: "CTC" },
  },
]

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
  if (!r.ok) {
    throw new Error(`${method} ${path} -> ${r.status} ${await r.text()}`)
  }
  return r.status === 204 ? null : r.json()
}
const get = (path) => api("GET", path)
const post = (path, body) => {
  if (DRY_RUN) {
    console.log(`[dry-run] would POST ${path}`, JSON.stringify(body))
    return null
  }
  return api("POST", path, body)
}
const emit = (msg) => console.log(DRY_RUN ? `[dry-run] ${msg}` : msg)
const live = (msg) => console.log(msg)

if (DRY_RUN) {
  live("DRY RUN — reporting planned actions only, no writes.")
}

// --- 1. Store currency: IDR supported ---
const { stores } = await get("/admin/stores?limit=10")
const store = stores[0]
if (!store.supported_currencies.some((c) => c.currency_code === "idr")) {
  emit("store lacks idr, adding to supported currencies")
  await post(`/admin/stores/${store.id}`, {
    supported_currencies: [
      ...store.supported_currencies.map((c) => ({
        currency_code: c.currency_code,
        is_default: !!c.is_default,
      })),
      { currency_code: "idr", is_default: false },
    ],
  })
} else {
  live("currency ok: idr supported")
}

// --- 2. Indonesia/IDR region ---
const { regions } = await get("/admin/regions?limit=100")
let region = regions.find(
  (r) =>
    r.currency_code === "idr" &&
    (r.countries || []).some((c) => (c.iso_2 || "").toLowerCase() === "id")
)
if (!region) {
  emit("no Indonesia/IDR region, creating one")
  const created = await post("/admin/regions", {
    name: "Indonesia",
    currency_code: "idr",
    countries: ["id"],
    payment_providers: ["pp_system_default"],
  })
  region = created?.region
} else {
  live(`region ok: ${region.name}`)
}

// --- 3. Tax region for `id` ---
const { tax_regions } = await get("/admin/tax-regions?limit=100")
if (!tax_regions.some((t) => t.country_code === "id")) {
  emit("no tax region for id, creating one (tp_system)")
  await post("/admin/tax-regions", {
    country_code: "id",
    provider_id: "tp_system",
  })
} else {
  live("tax region ok: id")
}

// --- 4. Pasar Jambi stock location ---
const { stock_locations } = await get("/admin/stock-locations?limit=100")
let location = stock_locations.find(
  (l) => l.name === LOCATION_NAME && !l.deleted_at
)
if (!location) {
  emit(`no live location "${LOCATION_NAME}", creating one`)
  const created = await post("/admin/stock-locations", {
    name: LOCATION_NAME,
    address: ADDRESS,
  })
  location = created?.stock_location
} else {
  live(`location ok: ${location.name} (${location.id})`)
}

// --- 5. Channel link: location -> Default Sales Channel ---
const { sales_channels } = await get("/admin/sales-channels?limit=10")
const channel = sales_channels.find((c) => c.name === CHANNEL_NAME)
if (!channel) {
  throw new Error(`sales channel "${CHANNEL_NAME}" not found, aborting`)
}
const channelDetail = await get(
  `/admin/sales-channels/${channel.id}?fields=*stock_locations`
)
const linkedIds = (channelDetail.sales_channel.stock_locations || []).map(
  (l) => l.id
)
if (location && !linkedIds.includes(location.id)) {
  emit(`linking location ${location.id} to channel ${channel.id}`)
  await post(`/admin/stock-locations/${location.id}/sales-channels`, {
    add: [channel.id],
  })
} else {
  live("channel link ok: location already on channel")
}

// Deep location read, mirroring the admin UI detail query: sets with their
// zones and geo-zones, plus linked providers. Single source for steps 6-7.
const TREE_FIELDS =
  "*fulfillment_sets,*fulfillment_sets.service_zones," +
  "*fulfillment_sets.service_zones.geo_zones,*fulfillment_providers"
const getLocationTree = async () => {
  const detail = await get(
    `/admin/stock-locations/${location.id}?fields=${TREE_FIELDS}`
  )
  return detail.stock_location || {}
}

// --- 6. Provider links on the location ---
{
  const tree = await getLocationTree()
  const linkedProviders = (tree.fulfillment_providers || [])
    .filter(Boolean)
    .map((p) => p.id || p.fulfillment_provider_id)
  for (const providerId of PROVIDERS) {
    if (!linkedProviders.includes(providerId)) {
      emit(`linking provider ${providerId} to location`)
      await post(
        `/admin/stock-locations/${location.id}/fulfillment-providers`,
        { add: [providerId] }
      )
    } else {
      live(`provider link ok: ${providerId}`)
    }
  }
}

// --- 7. Fulfillment set + service zone + id geo-zone ---
// Note: there is no GET route for a single fulfillment set, so sets and
// zones are always read through the location tree query above.
const findSetAndZone = async () => {
  let tree = {}
  try {
    tree = await getLocationTree()
  } catch (e) {
    throw new Error(
      `cannot list fulfillment sets (${(e && e.message) || e}), aborting instead of risking duplicates`
    )
  }
  const sets = (tree.fulfillment_sets || []).filter(Boolean)
  // Prefer the canonical name, but reuse an existing set when an operator
  // named it differently (e.g. "AA shipping"): any set on THIS location
  // with the expected zone or an `id` geo-zone is the same structure.
  // This keeps a fresh machine to a single set no matter what it is called.
  let set = sets.find((s) => s.name === SET_NAME) || null
  if (!set) {
    set =
      sets.find((s) =>
        (s.service_zones || []).some(
          (z) =>
            z &&
            (z.name === ZONE_NAME ||
              (z.geo_zones || []).some(
                (g) => g && (g.country_code || "").toLowerCase() === "id"
              ))
        )
      ) ||
      (sets.length === 1 ? sets[0] : null)
  }
  const zones = (set && set.service_zones) || []
  const zone =
    zones.find((z) => z && z.name === ZONE_NAME) ||
    zones.find((z) =>
      (z.geo_zones || []).some(
        (g) => g && (g.country_code || "").toLowerCase() === "id"
      )
    ) ||
    null
  return { set, zone }
}

let { set, zone } = await findSetAndZone()
let setId = (set && set.id) || null
if (!setId) {
  emit(`no fulfillment set "${SET_NAME}", creating one`)
  await post(`/admin/stock-locations/${location.id}/fulfillment-sets`, {
    name: SET_NAME,
    type: "shipping",
  })
  ;({ set } = await findSetAndZone())
  setId = (set && set.id) || null
}
if (!setId) {
  throw new Error("fulfillment set creation could not be confirmed, aborting")
}
live(`fulfillment set ok: ${set?.name || SET_NAME} (${setId})`)

let zoneId = (zone && zone.id) || null
if (zoneId) {
  const geo = zone.geo_zones || []
  if (geo.some((g) => g && (g.country_code || "").toLowerCase() === "id")) {
    live(`service zone ok: ${ZONE_NAME} with id geo-zone`)
  } else {
    live(
      `service zone "${ZONE_NAME}" exists without id geo-zone, leaving for manual manage-areas`
    )
  }
}
if (!zoneId) {
  emit(`no service zone "${ZONE_NAME}", creating one with id geo-zone`)
  await post(`/admin/fulfillment-sets/${setId}/service-zones`, {
    name: ZONE_NAME,
    geo_zones: [{ country_code: "id", type: "country" }],
  })
  ;({ zone } = await findSetAndZone())
  zoneId = (zone && zone.id) || null
}
if (!zoneId) {
  throw new Error("service zone creation could not be confirmed, aborting")
}

// --- 8. Shipping option type: standard ---
const { shipping_option_types } = await get(
  "/admin/shipping-option-types?limit=100"
)
let stdType = shipping_option_types.find((t) => t.code === "standard")
if (!stdType) {
  emit('no option type "standard", creating one')
  const created = await post("/admin/shipping-option-types", {
    label: "Standard",
    code: "standard",
    description: "Standard delivery",
  })
  stdType = created?.shipping_option_type
} else {
  live("option type ok: standard")
}

// --- 9. Shipping profile (first available; single-profile shop) ---
const { shipping_profiles } = await get("/admin/shipping-profiles?limit=10")
const profileId = shipping_profiles[0]?.id
if (!profileId) {
  throw new Error("no shipping profile found, aborting")
}

// --- 10. Enable jne-ctc service (ships OFF by default; the City Courier
// option below only quotes while its service is enabled) ---
const svcList = await get("/admin/rajaongkir-services")
const ctcRow = (svcList.rows || []).find((r) => r.code === "jne-ctc")
if (!ctcRow || !ctcRow.is_enabled) {
  emit("enabling jne-ctc service")
  await post("/admin/rajaongkir-services", {
    code: "jne-ctc",
    courier: "jne",
    service_code: "CTC",
    label: "JNE City Courier (intra-kota)",
    is_enabled: true,
  })
} else {
  live("service ok: jne-ctc enabled")
}

// --- 11. The three calculated shipping options ---
const { shipping_options } = await get("/admin/shipping-options?limit=100")
for (const opt of OPTIONS) {
  const exists = (shipping_options || []).some(
    (o) => o.name === opt.name && o.provider_id === "rajaongkir_rajaongkir"
  )
  if (exists) {
    live(`shipping option ok: ${opt.name}`)
    continue
  }
  emit(`creating calculated option ${opt.name}`)
  await post("/admin/shipping-options", {
    name: opt.name,
    price_type: "calculated",
    provider_id: "rajaongkir_rajaongkir",
    service_zone_id: zoneId,
    shipping_profile_id: profileId,
    type_id: stdType.id,
    data: opt.data,
    prices: [],
    rules: [
      { attribute: "enabled_in_store", value: "true", operator: "eq" },
      { attribute: "is_return", value: "false", operator: "eq" },
    ],
  })
}

live(DRY_RUN ? "DRY RUN complete — no writes performed." : "Shipping setup complete.")

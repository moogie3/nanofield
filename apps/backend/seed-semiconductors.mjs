// One-off seeder: semiconductor demo catalog for Nanofield.
// Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... node seed-semiconductors.mjs
// Safe to re-run: skips categories/products that already exist by handle/name.
const BASE = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

const loginRes = await fetch(`${BASE}/auth/user/emailpass`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL || "admin@test.com",
    password: process.env.ADMIN_PASSWORD || "supersecret",
  }),
});
if (!loginRes.ok) {
  console.error("LOGIN FAILED:", loginRes.status, await loginRes.text());
  process.exit(1);
}
const { token } = await loginRes.json();
const H = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

const api = async (method, path, body) => {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok)
    throw new Error(`${method} ${path} -> ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
};
const get = (path) => api("GET", path);

// --- resolve supporting IDs ---
const channels = await get("/admin/sales-channels?limit=10");
const channelId = channels.sales_channels[0].id;
const locations = await get("/admin/stock-locations?limit=10");
const locationId = locations.stock_locations[0].id;
const profiles = await get("/admin/shipping-profiles?limit=10");
const shippingProfileId = profiles.shipping_profiles[0].id;
console.log(
  `channel=${channelId} location=${locationId} profile=${shippingProfileId}`,
);

// --- categories ---
const CATEGORY_NAMES = [
  "Integrated Circuits",
  "Transistors",
  "MOSFETs",
  "Capacitors",
  "Resistors",
  "Diodes & Rectifiers",
  "Modules & Boards",
];
const existingCats = await get("/admin/product-categories?limit=100");
const catByName = Object.fromEntries(
  existingCats.product_categories.map((c) => [c.name, c.id]),
);
for (const name of CATEGORY_NAMES) {
  if (!catByName[name]) {
    const created = await api("POST", "/admin/product-categories", {
      name,
      is_active: true,
    });
    catByName[name] = created.product_category.id;
    console.log(`category created: ${name}`);
  }
}

// --- products ---
const PARTS = [
  {
    handle: "ne555p-timer-ic",
    title: "NE555P Precision Timer IC",
    cat: "Integrated Circuits",
    sku: "IC-0399",
    mfr: "Texas Instruments",
    pkg: "DIP-8",
    mount: "Through-Hole",
    temp: "-40°C to +85°C",
    eur: 2,
    usd: 2,
  },
  {
    handle: "lm7805-regulator",
    title: "LM7805 5V Voltage Regulator",
    cat: "Integrated Circuits",
    sku: "IC-0401",
    mfr: "STMicroelectronics",
    pkg: "TO-220",
    mount: "Through-Hole",
    temp: "0°C to +125°C",
    voltage: "35",
    current: "1.5",
    eur: 2,
    usd: 2,
  },
  {
    handle: "2n2222-transistor",
    title: "2N2222 NPN Transistor",
    cat: "Transistors",
    sku: "TRS-0051",
    mfr: "ON Semiconductor",
    pkg: "TO-92",
    mount: "Through-Hole",
    temp: "-65°C to +150°C",
    voltage: "40",
    current: "0.8",
    eur: 1,
    usd: 1,
  },
  {
    handle: "bc547-transistor",
    title: "BC547 NPN Transistor",
    cat: "Transistors",
    sku: "TRS-0052",
    mfr: "ON Semiconductor",
    pkg: "TO-92",
    mount: "Through-Hole",
    temp: "-65°C to +150°C",
    voltage: "45",
    current: "0.1",
    eur: 1,
    usd: 1,
  },
  {
    handle: "irf540n-mosfet",
    title: "IRF540N Power MOSFET N-Channel",
    cat: "MOSFETs",
    sku: "MOS-0117",
    mfr: "Infineon",
    pkg: "TO-220",
    mount: "Through-Hole",
    temp: "-55°C to +175°C",
    voltage: "100",
    current: "33",
    eur: 3,
    usd: 3,
  },
  {
    handle: "cap-100nf-50v",
    title: "100nF Ceramic Capacitor 50V 0805",
    cat: "Capacitors",
    sku: "CAP-0223",
    mfr: "Murata",
    pkg: "0805",
    mount: "SMD",
    temp: "-55°C to +125°C",
    voltage: "50",
    eur: 1,
    usd: 1,
  },
  {
    handle: "cap-470uf-25v",
    title: "470µF Electrolytic Capacitor 25V",
    cat: "Capacitors",
    sku: "CAP-0224",
    mfr: "Nichicon",
    pkg: "Radial 8x12mm",
    mount: "Through-Hole",
    temp: "-40°C to +105°C",
    voltage: "25",
    eur: 1,
    usd: 1,
  },
  {
    handle: "res-10k-0805",
    title: "10kΩ Resistor 1% 0.125W 0805",
    cat: "Resistors",
    sku: "RES-0310",
    mfr: "Yageo",
    pkg: "0805",
    mount: "SMD",
    temp: "-55°C to +155°C",
    eur: 1,
    usd: 1,
  },
  {
    handle: "1n4007-diode",
    title: "1N4007 Rectifier Diode 1A 1000V",
    cat: "Diodes & Rectifiers",
    sku: "DIO-0442",
    mfr: "Vishay",
    pkg: "DO-41",
    mount: "Through-Hole",
    temp: "-65°C to +175°C",
    voltage: "1000",
    current: "1",
    eur: 1,
    usd: 1,
  },
  {
    handle: "ss14-schottky",
    title: "SS14 Schottky Diode 1A 40V SMA",
    cat: "Diodes & Rectifiers",
    sku: "DIO-0443",
    mfr: "Vishay",
    pkg: "SMA",
    mount: "SMD",
    temp: "-65°C to +150°C",
    voltage: "40",
    current: "1",
    eur: 1,
    usd: 1,
  },
  {
    handle: "esp32-wroom-32",
    title: "ESP32-WROOM-32 WiFi+BT Module",
    cat: "Modules & Boards",
    sku: "MOD-0501",
    mfr: "Espressif",
    pkg: "SMD Module",
    mount: "SMD",
    temp: "-40°C to +85°C",
    voltage: "3.6",
    eur: 12,
    usd: 13,
  },
  {
    handle: "oled-096-i2c",
    title: '0.96" OLED Display 128x64 I2C',
    cat: "Modules & Boards",
    sku: "MOD-0502",
    mfr: "Generic",
    pkg: "Module 4-pin",
    mount: "Through-Hole",
    temp: "-30°C to +70°C",
    voltage: "5",
    eur: 9,
    usd: 10,
  },
];

const existing = await get("/admin/products?limit=100&fields=handle");
const existingHandles = new Set(existing.products.map((p) => p.handle));

let created = 0;
for (const part of PARTS) {
  if (existingHandles.has(part.handle)) {
    console.log(`skip (exists): ${part.handle}`);
    continue;
  }
  const metadata = {
    part_number: part.sku,
    manufacturer: part.mfr,
    package_case: part.pkg,
    mounting_type: part.mount,
    operating_temp: part.temp,
    is_semiconductor: true,
    rohs: "true",
    lead_free: "true",
  };
  if (part.voltage) metadata.voltage_rating = part.voltage;
  if (part.current) metadata.current_rating = part.current;

  const res = await api("POST", "/admin/products", {
    title: part.title,
    handle: part.handle,
    description: `${part.title} by ${part.mfr} in ${part.pkg} package. Genuine stock, datasheet available.`,
    status: "published",
    discountable: true,
    metadata,
    categories: [{ id: catByName[part.cat] }],
    sales_channels: [{ id: channelId }],
    shipping_profile_id: shippingProfileId,
    options: [{ title: "Part", values: ["Default"] }],
    variants: [
      {
        title: "Default",
        sku: part.sku,
        manage_inventory: true,
        options: { Part: "Default" },
        prices: [
          { amount: part.eur, currency_code: "eur" },
          { amount: part.usd, currency_code: "usd" },
        ],
      },
    ],
  });
  const variant = res.product.variants[0];
  const invItemId =
    variant?.inventory_items?.[0]?.inventory_item_id ||
    (await get(`/admin/inventory-items?q=${part.sku}`)).inventory_items[0]?.id;
  if (invItemId) {
    await api("POST", `/admin/inventory-items/${invItemId}/location-levels`, {
      location_id: locationId,
      stocked_quantity: 500,
    });
  }
  created++;
  console.log(`created: ${part.handle} (${part.sku}) stock=500`);
}
console.log(`DONE. ${created} products created.`);

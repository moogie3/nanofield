// One-off probe: learn IDs needed for seeding. Safe (read-only).
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
const get = async (path) => {
  const r = await fetch(`${BASE}${path}`, { headers: H });
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
  return r.json();
};

const channels = await get("/admin/sales-channels?limit=10");
console.log(
  "CHANNELS:",
  channels.sales_channels.map((c) => `${c.id} (${c.name})`).join(", "),
);
const locations = await get("/admin/stock-locations?limit=10");
console.log(
  "LOCATIONS:",
  locations.stock_locations.map((l) => `${l.id} (${l.name})`).join(", "),
);
const profiles = await get("/admin/shipping-profiles?limit=10");
console.log(
  "PROFILES:",
  profiles.shipping_profiles.map((p) => `${p.id} (${p.name})`).join(", "),
);
const regions = await get("/admin/regions?limit=20");
console.log(
  "REGIONS:",
  regions.regions
    .map(
      (r) =>
        `${r.id} (${r.name} ${r.currency_code} countries:${(r.countries || []).map((c) => c.iso_2).join(",")})`,
    )
    .join(" | "),
);
const cats = await get("/admin/product-categories?limit=50");
console.log(
  "CATEGORIES:",
  cats.product_categories.map((c) => `${c.id} (${c.name})`).join(", "),
);
const prods = await get("/admin/products?limit=50&fields=id,title,handle");
console.log("PRODUCTS:", prods.products.map((p) => `${p.handle}`).join(", "));

import { model } from "@medusajs/framework/utils"

// One row per (key, locale). Storefront settings that operators edit from
// /app/content: contact channels, hero copy, footer tagline. Keys come from a
// fixed catalog (src/modules/content/keys.ts) so the admin form and the store
// route agree on what exists. A missing (key, locale) row means "not set" —
// the storefront falls back to its own defaults, nothing is seeded here.
export const SiteSetting = model.define("site_setting", {
  id: model.id().primaryKey(),
  key: model.text(),
  locale: model.text(),
  value: model.text(),
}).indexes([
  {
    on: ["key", "locale"],
    unique: true,
  },
])

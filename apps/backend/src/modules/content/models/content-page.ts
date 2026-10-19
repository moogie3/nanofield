import { model } from "@medusajs/framework/utils"

// One row per (slug, locale). Long-form storefront pages: About / Terms /
// Privacy / Shipping, plus overrides for the structured support pages "faq",
// "returns" and "contact" (see modules/content/registry.ts for the per-page
// section shapes those slugs expect).
//
// Two body shapes coexist:
//   body  - plain text with a light block convention the storefront renders
//           (## heading, ### sub-heading, - bullet, Q:/A: card, blank line =
//           paragraph). Used by custom pages (about/terms/...).
//   data  - JSON object for registry pages, one key per section (e.g.
//           { steps: [{ title, body }], conditions: [...] }). The storefront
//           merges each field over its i18n default, so a missing key keeps
//           the shipped copy and the page can never go blank.
// Nothing is deleted by the UI �?" status flips draft/published so history is
// kept and a page can be hidden without losing its copy.
export const ContentPage = model.define("content_page", {
  id: model.id().primaryKey(),
  slug: model.text(),
  locale: model.text(),
  title: model.text(),
  subtitle: model.text().nullable(),
  body: model.text().default(""),
  data: model.json().nullable(),
  status: model.text().default("published"),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
}).indexes([
  {
    on: ["slug", "locale"],
    unique: true,
  },
])

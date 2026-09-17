import { model } from "@medusajs/framework/utils"

// One row per storefront banner, managed from /app/announcements.
// type "announcement" renders the text strip; type "image" renders the
// fixed image banner. Visibility = is_published AND now within
// [starts_at, ends_at] (null bounds mean open). Rows are never deleted by
// the UI — unpublish flips is_published so history is kept.
export const Banner = model.define("banner", {
  id: model.id().primaryKey(),
  type: model.text(),
  title: model.text(),
  description: model.text().nullable(),
  link: model.text().nullable(),
  image_url: model.text().nullable(),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  is_published: model.boolean().default(true),
})

import { model } from "@medusajs/framework/utils"

// Store sender block printed as Pengirim on every shipping label. At most
// one row is ever used (the first); the admin page upserts it and the
// receipt route falls back to STORE_* env when no row exists, so labels
// never break on a fresh database.
export const SenderProfile = model.define("sender_profile", {
  id: model.id().primaryKey(),
  name: model.text(),
  phone: model.text(),
  address_1: model.text(),
  city: model.text(),
  province: model.text(),
  country_code: model.text(),
})

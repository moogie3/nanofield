import { model } from "@medusajs/framework/utils"

// One row per shippable service managed from the admin
// (/app/rajaongkir-services). Rows override or extend the built-in catalog
// in catalog.ts by `code`: same code replaces the built-in entry (including
// disabling it via is_enabled=false), unknown codes are appended as custom
// services. Built-ins can never be deleted — only disabled.
export const ShippingService = model
  .define("shipping_service", {
    id: model.id().primaryKey(),
    code: model.text(),
    courier: model.text(),
    service_code: model.text(),
    label: model.text(),
    cheapest_match: model.boolean().default(false),
    is_enabled: model.boolean().default(true),
  })

import { MedusaService } from "@medusajs/framework/utils"
import { ShippingService } from "./models/shipping-service"

// CRUD surface for the admin-managed service catalog. Generated methods
// used: listShippingServices, createShippingServices, updateShippingServices,
// deleteShippingServices. Uniqueness of `code` is enforced by callers
// (upsert-by-code), not by a DB constraint.
class RajaongkirModuleService extends MedusaService({
  ShippingService,
}) {}

export default RajaongkirModuleService

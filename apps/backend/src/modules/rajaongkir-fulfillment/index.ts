import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import RajaongkirFulfillmentProviderService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [RajaongkirFulfillmentProviderService],
})

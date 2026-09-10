import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import MidtransPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [MidtransPaymentProviderService],
})

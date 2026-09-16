import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import MailtrapNotificationProviderService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [MailtrapNotificationProviderService],
})

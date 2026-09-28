import { Module } from "@medusajs/framework/utils"
import AuditLogModuleService from "./service"

export const AUDIT_LOG_MODULE = "audit_log"

// NOTE: cross-module container wiring (query/link/rbac for bootstrapTiers)
// lives on the medusa-config.ts entry for this module, NOT here — Module()
// only keeps service/loaders/linkable and silently drops `dependencies`.
// See the dependencies array next to resolve: "./src/modules/audit-log".
export default Module(AUDIT_LOG_MODULE, {
  service: AuditLogModuleService,
})

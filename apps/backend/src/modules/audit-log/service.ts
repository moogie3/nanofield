import { MedusaService } from "@medusajs/framework/utils"
import { AuditEntry } from "./models/audit-entry"

// CRUD surface for the audit log. Generated methods used: listAuditEntries,
// createAuditEntries, deleteAuditEntries. Writes happen fire-and-forget
// from the audit middleware; reads are owner-only via /admin/audit-logs.
class AuditLogModuleService extends MedusaService({
  AuditEntry,
}) {}

export default AuditLogModuleService

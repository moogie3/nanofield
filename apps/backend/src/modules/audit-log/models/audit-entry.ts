import { model } from "@medusajs/framework/utils"

// One row per admin mutation (POST/PATCH/PUT/DELETE on /admin/*), written
// after the response by the audit middleware — never in the request path.
// No request bodies ever (passwords, tokens); method + path + status is
// enough to answer "who changed what, when". Reads (GET) are not logged:
// volume would drown the signal. Bounded by the audit-retention job.
export const AuditEntry = model.define("audit_entry", {
  id: model.id().primaryKey(),
  actor_id: model.text(),
  actor_email: model.text().nullable(),
  method: model.text(),
  path: model.text(),
  status: model.number(),
})

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { hasPermission } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

type AuditOps = {
  listAuditEntries: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<AuditRow[]>
}

type AuditRow = {
  id: string
  actor_id: string
  actor_email?: string | null
  method: string
  path: string
  status: number
  created_at?: string
}

const AUDIT_KEYS = ["audit_log", "auditLogModuleService"]

// Owner-only read: requires the audit-log:read permission (Owner role).
// Staff roles without it get 403. hasPermission is fail-open when the RBAC
// flag is off or the caller has no roles — the flag is enabled in this
// project (MEDUSA_FF_RBAC), so in practice this gate is strict.
const requireAuditRead = async (req: MedusaRequest): Promise<void> => {
  const auth = (
    req as unknown as { auth_context?: { actor_id?: string } }
  ).auth_context
  if (!auth?.actor_id) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Not authenticated")
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: unknown) => Promise<{ data?: { rbac_roles?: { id: string }[] }[] }>
  }
  let roleIds: string[] = []
  try {
    const { data } = await query.graph({
      entity: "user",
      fields: ["id", "rbac_roles.id"],
      filters: { id: auth.actor_id },
    })
    roleIds =
      data?.[0]?.rbac_roles?.map((r) => r.id).filter(Boolean) ?? []
  } catch {
    roleIds = []
  }
  const allowed =
    roleIds.length > 0 &&
    (await hasPermission({
      roles: roleIds,
      actions: { resource: "audit-log", operation: "read" },
      container: req.scope,
    }))
  if (!allowed) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Audit log is restricted to the owner role."
    )
  }
}

const auditLog = (req: MedusaRequest): AuditOps => {
  const resolve = req.scope.resolve as unknown as (
    key: string
  ) => AuditOps | null
  for (const key of AUDIT_KEYS) {
    try {
      const svc = resolve(key)
      if (svc && typeof svc.listAuditEntries === "function") {
        return svc
      }
    } catch {
      // try the next key
    }
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "audit-log module is not loaded"
  )
}

// Newest first, paginated. Filters pushed to DB where possible:
//   method — exact match
//   path   — case-insensitive substring via $ilike
//   actor  — $ilike on actor_id OR actor_email ($or)
// has_more uses the +1 sentinel to avoid a separate count query.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  await requireAuditRead(req)
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50)
  )
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0)
  const filters: Record<string, unknown> = {}

  if (req.query.method) {
    filters.method = String(req.query.method).toUpperCase()
  }

  const pathFilter =
    typeof req.query.path === "string" ? req.query.path.trim() : ""
  if (pathFilter) {
    filters.path = { $ilike: `%${pathFilter}%` }
  }

  const actorFilter =
    typeof req.query.actor === "string" ? req.query.actor.trim() : ""
  if (actorFilter) {
    filters.$or = [
      { actor_id: { $ilike: `%${actorFilter}%` } },
      { actor_email: { $ilike: `%${actorFilter}%` } },
    ]
  }

  const rows = await auditLog(req).listAuditEntries(filters, {
    take: limit + 1,
    skip: offset,
    order: { created_at: "DESC" },
  })

  let entries = rows
  let hasMore = false
  if (rows.length > limit) {
    entries = rows.slice(0, limit)
    hasMore = true
  }

  res.status(200).json({ entries, has_more: hasMore })
}

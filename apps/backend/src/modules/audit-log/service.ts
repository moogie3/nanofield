import { MedusaService, Modules } from "@medusajs/framework/utils"
import { MedusaModule } from "@medusajs/framework/modules-sdk"
import { AuditEntry } from "./models/audit-entry"

// CRUD surface for the audit log. Generated methods used: listAuditEntries,
// createAuditEntries, deleteAuditEntries. Writes happen fire-and-forget
// from the audit middleware; reads are owner-only via /admin/audit-logs.
//
// onApplicationStart runs after all modules are loaded and performs the
// one-time tier bootstrap: ensures the Owner/Staff roles and the audit-log
// read policy exist, then assigns Owner to AUDIT_OWNER_EMAIL. This avoids
// the module-loader container-scope problem (loaders only see localContainer;
// rbacModuleService lives in the global container). MedusaModule.getModuleInstance
// gives us the live rbac service instance without any container gymnastics.

const AUDIT_POLICY = {
  key: "audit-log-read",
  resource: "audit-log",
  operation: "read",
  name: "audit-log-read",
  description: "Read the admin audit log (/app/audit-log).",
}

// The wildcard policy key Medusa's RBAC engine registers for unrestricted
// access. Do NOT create a custom one — look up the existing *:* policy and
// link Owner to it.
const WILDCARD_POLICY_KEY = "*:*"

const OWNER_NAME = "Owner"
const STAFF_NAME = "Staff"

type RbacService = {
  listRbacPolicies: (filters?: Record<string, unknown>) => Promise<{ id: string }[]>
  createRbacPolicies: (
    data: Record<string, unknown>
  ) => Promise<{ id: string } | { id: string }[]>
  listRbacRoles: (
    filters?: Record<string, unknown>
  ) => Promise<{ id: string; name: string }[]>
  createRbacRoles: (
    data: Record<string, unknown>
  ) => Promise<{ id: string } | { id: string }[]>
  listRbacRolePolicies: (
    filters?: Record<string, unknown>
  ) => Promise<{ id: string; policy_id?: string; policy?: { id: string } }[]>
  createRbacRolePolicies: (data: Record<string, unknown>) => Promise<unknown>
}

type QueryService = { graph: (args: unknown) => Promise<{ data?: any[] }> }
type LinkService = { create: (data: Record<string, unknown>[]) => Promise<void> }

const firstId = (res: { id: string } | { id: string }[]): string =>
  (Array.isArray(res) ? res[0] : res)?.id as string

class AuditLogModuleService extends MedusaService({
  AuditEntry,
}) {
  private readonly __auditContainer__: Record<string, any>

  constructor(container: Record<string, any>) {
    super(...([container] as [any]))
    this.__auditContainer__ = container

    this.__hooks = {
      onApplicationStart: async () => {
        await this.bootstrapTiers()
      },
    }
  }

  private async bootstrapTiers(): Promise<void> {
    const log: { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void } =
      (() => {
        try {
          return this.__auditContainer__["logger"]
        } catch {
          return console as any
        }
      })()
    const tag = "bootstrap-tiers:"

    // RBAC service lookup, in order of reliability:
    // 1. local container — "rbac" is declared in the medusa-config.ts entry
    //    dependencies, so the framework forwards the global registration
    //    (plus the legacy "rbacModuleService" alias as backup). NOTE: the
    //    local container is an awilix cradle — property access THROWS for
    //    unregistered keys, hence the per-key try/catch.
    // 2. MedusaModule static registry — populated once all modules load.
    const candidates: { via: string; svc: unknown }[] = []
    for (const key of [Modules.RBAC, "rbacModuleService"]) {
      try {
        candidates.push({
          via: `container:${key}`,
          svc: this.__auditContainer__[key],
        })
      } catch {
        // not forwarded under this key — try the next
      }
    }
    try {
      candidates.push({
        via: "registry",
        svc: MedusaModule.getModuleInstance(Modules.RBAC),
      })
    } catch {
      // registry miss — handled below
    }
    let rbac: RbacService | null = null
    let rbacVia = ""
    for (const c of candidates) {
      const svc = c.svc as RbacService | null | undefined
      if (svc && typeof svc.listRbacRoles === "function") {
        rbac = svc
        rbacVia = c.via
        break
      }
    }
    if (!rbac) {
      log.warn(
        `${tag} rbac service not resolvable (tried: ${candidates
          .map((c) => c.via)
          .join(", ")}) — skipping tier bootstrap`
      )
      return
    }
    log.info(`${tag} rbac service resolved via ${rbacVia}`)

    let query: QueryService | null = null
    let link: LinkService | null = null
    try {
      query = this.__auditContainer__["query"] as QueryService
      link = this.__auditContainer__["link"] as LinkService
    } catch {
      query = null
      link = null
    }
    if (!query || !link) {
      log.warn(`${tag} query/link not available in container — skipping Owner assignment`)
    }

    const lookupPolicy = async (key: string): Promise<string | null> => {
      const existing = await rbac!.listRbacPolicies({ key })
      return existing[0]?.id ?? null
    }

    const ensurePolicy = async (def: typeof AUDIT_POLICY): Promise<string> => {
      const existing = await rbac!.listRbacPolicies({ key: def.key })
      if (existing[0]?.id) {
        return existing[0].id
      }
      return firstId(await rbac!.createRbacPolicies({ ...def }))
    }

    const ensureRole = async (name: string, description: string): Promise<string> => {
      const existing = await rbac!.listRbacRoles({ name })
      if (existing[0]?.id) {
        return existing[0].id
      }
      return firstId(await rbac!.createRbacRoles({ name, description }))
    }

    let auditPolicyId: string
    let wildcardPolicyId: string | null
    let ownerRoleId: string
    try {
      auditPolicyId = await ensurePolicy(AUDIT_POLICY)
      // Use Medusa's built-in *:* wildcard policy for Owner full-access.
      // Do NOT create a custom one — *:* is what the RBAC engine checks.
      wildcardPolicyId = await lookupPolicy(WILDCARD_POLICY_KEY)
      ownerRoleId = await ensureRole(
        OWNER_NAME,
        "Full access including the audit log. First/inviting admin."
      )
      await ensureRole(
        STAFF_NAME,
        "Day-to-day admin without audit-log access. Assigned to every invite."
      )
    } catch (e) {
      log.warn(`${tag} could not ensure policies/roles (${(e as Error)?.message || e})`)
      return
    }

    try {
      const links = await rbac.listRbacRolePolicies({ role_id: ownerRoleId })
      const attached = new Set(
        links.map((l) => l.policy_id ?? l.policy?.id).filter(Boolean)
      )
      const toAttach = [auditPolicyId, wildcardPolicyId].filter(Boolean) as string[]
      for (const policyId of toAttach) {
        if (attached.has(policyId)) {
          continue
        }
        try {
          await rbac.createRbacRolePolicies({
            role_id: ownerRoleId,
            policy_id: policyId,
          })
        } catch {
          // unique violation under concurrent boots — the link already exists
        }
      }
    } catch (e) {
      log.warn(`${tag} could not attach policies to Owner (${(e as Error)?.message || e})`)
      return
    }

    if (!query || !link) {
      log.warn(`${tag} tiers ready, but Owner assignment skipped (no query/link)`)
      return
    }

    const ownerEmail = (process.env.AUDIT_OWNER_EMAIL || "").trim().toLowerCase()
    if (!ownerEmail) {
      log.warn(`${tag} tiers ready, but AUDIT_OWNER_EMAIL is not set — Owner unassigned`)
      return
    }

    try {
      let users: any[] = []
      try {
        const { data } = await query.graph({
          entity: "user",
          fields: ["id", "email", "rbac_roles.id"],
          filters: { email: ownerEmail },
        })
        users = data ?? []
      } catch {
        users = []
      }
      if (!users.length) {
        const { data: all } = await query.graph({
          entity: "user",
          fields: ["id", "email", "rbac_roles.id"],
          filters: {},
        })
        users = (all ?? []).filter(
          (u: any) => (u.email || "").toLowerCase() === ownerEmail
        )
      }
      const user = users[0]
      if (!user?.id) {
        log.warn(`${tag} tiers ready, but no admin has email ${ownerEmail} yet`)
        return
      }
      const roleIds = ((user.rbac_roles ?? []) as { id: string }[]).map((r) => r.id)
      if (roleIds.includes(ownerRoleId)) {
        log.info(`${tag} tiers ready, ${ownerEmail} already holds Owner`)
        return
      }
      await link.create([
        {
          [Modules.USER]: { user_id: user.id },
          [Modules.RBAC]: { rbac_role_id: ownerRoleId },
        },
      ])
      log.info(
        `${tag} tiers ready, assigned Owner to ${ownerEmail} — log out and back in for it to take effect`
      )
    } catch (e) {
      log.warn(
        `${tag} tiers ready, but Owner assignment failed (${(e as Error)?.message || e})`
      )
    }
  }
}

export default AuditLogModuleService

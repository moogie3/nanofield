import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

// Owner-only: manage the RBAC role of any admin user.
// GET  ?user_id=xxx  → { user_role: RbacRole | null, roles: RbacRole[] }
// POST { user_id, role_id }  → replace the user's single role (or clear if role_id is null/"")

type QueryService = {
  graph: (args: unknown) => Promise<{ data?: any[] }>
}

type LinkService = {
  create: (data: Record<string, unknown>[]) => Promise<void>
  dismiss: (data: Record<string, unknown>[]) => Promise<void>
}

type RbacModuleService = {
  listRbacRoles: (filters?: Record<string, unknown>) => Promise<{ id: string; name: string; description?: string }[]>
}

const requireOwner = async (req: MedusaRequest): Promise<void> => {
  const auth = (req as any).auth_context
  if (!auth?.actor_id) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Not authenticated")
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as QueryService
  let roleNames: string[] = []
  try {
    const { data } = await query.graph({
      entity: "user",
      fields: ["id", "rbac_roles.name"],
      filters: { id: auth.actor_id },
    })
    roleNames = (data?.[0]?.rbac_roles ?? []).map((r: any) => r.name as string)
  } catch {
    roleNames = []
  }
  if (!roleNames.includes("Owner")) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Role management is restricted to the Owner role."
    )
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  await requireOwner(req)

  const userId = String(req.query.user_id ?? "").trim()
  if (!userId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "user_id is required")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as QueryService
  // req.scope is the global request scope: try the definition key first,
  // then the legacy service alias.
  let rbac: RbacModuleService | null = null
  for (const key of [Modules.RBAC, "rbacModuleService"]) {
    try {
      const candidate = req.scope.resolve(key) as RbacModuleService
      if (candidate && typeof candidate.listRbacRoles === "function") {
        rbac = candidate
        break
      }
    } catch {
      // try the next key
    }
  }
  if (!rbac) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "rbac module is not loaded"
    )
  }

  const [{ data: userData }, allRoles] = await Promise.all([
    query.graph({
      entity: "user",
      fields: ["id", "email", "rbac_roles.id", "rbac_roles.name"],
      filters: { id: userId },
    }),
    rbac.listRbacRoles(),
  ])

  const user = userData?.[0]
  if (!user) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "User not found")
  }

  const userRoles: { id: string; name: string }[] = user.rbac_roles ?? []

  res.status(200).json({
    user_role: userRoles[0] ?? null,
    roles: allRoles,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  await requireOwner(req)

  const body = req.body as { user_id?: string; role_id?: string | null }
  const userId = (body.user_id ?? "").trim()
  const newRoleId = (body.role_id ?? "").trim()

  if (!userId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "user_id is required")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as QueryService
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK) as LinkService

  // Fetch the user's current roles to remove
  const { data: userData } = await query.graph({
    entity: "user",
    fields: ["id", "rbac_roles.id"],
    filters: { id: userId },
  })
  const user = userData?.[0]
  if (!user) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "User not found")
  }

  const currentRoles: { id: string }[] = user.rbac_roles ?? []

  // Remove all existing role links
  if (currentRoles.length > 0) {
    await link.dismiss(
      currentRoles.map((r) => ({
        [Modules.USER]: { user_id: userId },
        [Modules.RBAC]: { rbac_role_id: r.id },
      }))
    )
  }

  // Assign the new role (if provided)
  if (newRoleId) {
    await link.create([
      {
        [Modules.USER]: { user_id: userId },
        [Modules.RBAC]: { rbac_role_id: newRoleId },
      },
    ])
  }

  res.status(200).json({ success: true })
}

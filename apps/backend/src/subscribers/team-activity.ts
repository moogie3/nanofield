import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { notifyFeed } from "../api/admin/shopee-imports/notify"

// Team security events: who joined, changed, or left the admin.
// Broadcast — every admin should see team changes. Volume is inherently
// tiny (humans, not imports), so no filtering needed.
//
// On user.created: automatically assigns a tier role so the new invitee is
// never role-less (hasPermission fail-opens for users with NO roles).
// The AUDIT_OWNER_EMAIL admin gets Owner (audit-log access); everyone else
// gets the policy-less Staff role (correctly denied). Roles are ensured by
// the audit-log module loader at boot; a missing role skips silently here.

type RbacService = {
  listRbacRoles: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<{ id: string; name: string }[]>
}

const assignTierRole = async (
  container: SubscriberArgs<{ id: string }>["container"],
  userId: string,
  email: string
): Promise<void> => {
  try {
    const ownerEmail = (process.env.AUDIT_OWNER_EMAIL || "")
      .trim()
      .toLowerCase()
    const roleName =
      ownerEmail && email.trim().toLowerCase() === ownerEmail
        ? "Owner"
        : "Staff"
    // Global container here (not a module loader scope), so the shared
    // rbac registration is visible. Try both known keys — the definition
    // key ("rbac") first, then the legacy service alias.
    let rbac: RbacService | null = null
    for (const key of [Modules.RBAC, "rbacModuleService"]) {
      try {
        const candidate = container.resolve(key) as RbacService
        if (candidate && typeof candidate.listRbacRoles === "function") {
          rbac = candidate
          break
        }
      } catch {
        // try the next key
      }
    }
    if (!rbac) {
      return
    }
    const roles = await rbac.listRbacRoles(
      { name: roleName },
      { take: 1, select: ["id", "name"] }
    )
    const role = roles?.[0]
    if (!role) {
      // loader has not created tiers yet — skip silently
      return
    }
    const link = container.resolve(
      ContainerRegistrationKeys.LINK
    ) as unknown as {
      create: (data: Record<string, unknown>[]) => Promise<void>
    }
    await link.create([
      {
        [Modules.USER]: { user_id: userId },
        [Modules.RBAC]: { rbac_role_id: role.id },
      },
    ])
  } catch {
    // Role assignment must never block or crash the team event
  }
}

export default async function teamActivityHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const { name, data } = event as unknown as {
    name: string
    data: { id: string }
  }
  const verb =
    name === "user.created"
      ? "added"
      : name === "user.deleted"
        ? "removed"
        : "updated"

  let who = data.id
  let email = ""
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: users } = (await query.graph({
      entity: "user",
      fields: ["id", "email", "first_name", "last_name"],
      filters: { id: data.id },
    })) as {
      data: {
        id: string
        email: string
        first_name: string | null
        last_name: string | null
      }[]
    }
    const user = users?.[0]
    if (user) {
      email = user.email || ""
      const fullName = [user.first_name, user.last_name]
        .filter(Boolean)
        .join(" ")
      who = fullName ? `${fullName} (${user.email})` : user.email
    }
  } catch {
    // fall back to the id — the bell still fires
  }

  // Auto-assign the tier role to newly invited admins so they are never
  // role-less (role-less users fail-open through hasPermission). Owner
  // email gets Owner, everyone else gets Staff.
  if (name === "user.created") {
    await assignTierRole(container, data.id, email)
  }

  await notifyFeed(container, {
    to: "",
    title: `Team member ${verb}`,
    description:
      verb === "removed"
        ? `${who} no longer has admin access.`
        : `${who} — review role if unexpected.`,
  })
}

export const config: SubscriberConfig = {
  event: ["user.created", "user.updated", "user.deleted"],
}

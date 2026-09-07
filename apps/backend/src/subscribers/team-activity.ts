import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyFeed } from "../api/admin/shopee-imports/notify"

// Team security events: who joined, changed, or left the admin.
// Broadcast — every admin should see team changes. Volume is inherently
// tiny (humans, not imports), so no filtering needed.
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
      const fullName = [user.first_name, user.last_name]
        .filter(Boolean)
        .join(" ")
      who = fullName ? `${fullName} (${user.email})` : user.email
    }
  } catch {
    // fall back to the id — the bell still fires
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

import type { MedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// Posts into the admin navbar bell (Notification Center reads channel
// "feed" addressed to the admin user id/email). The local feed provider
// persists without sending anywhere — the bell IS the delivery.
// Never throws: feed must not break the operation it reports on.
export const notifyFeed = async (
  scope: MedusaRequest["scope"],
  opts: { to?: string; title: string; description?: string }
) => {
  try {
    const notificationModule = scope.resolve(Modules.NOTIFICATION)
    await notificationModule.createNotifications({
      to: opts.to || "",
      channel: "feed",
      template: "nanofield-feed",
      data: {
        title: opts.title,
        description: opts.description || "",
      },
    })
  } catch {
    // bell unavailable — the job page still shows the full report
  }
}

// Address the notification to the admin who triggered the request so it
// shows under their bell (the drawer also matches broadcast "").
export const feedRecipient = (req: MedusaRequest): string => {
  const auth = req.auth_context as { actor_id?: string } | undefined
  return auth?.actor_id || ""
}

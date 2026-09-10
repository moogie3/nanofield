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

// Indonesian Rupiah without decimals or float noise. Query totals arrive
// as BigNumber decimal strings ("190000.0000000000000000") — never
// interpolate those raw into operator-facing text.
export const formatIDR = (
  amount: number | string | null | undefined
): string => {
  const n = Math.round(Number(amount))
  if (!Number.isFinite(n)) {
    return "Rp 0"
  }
  const sign = n < 0 ? "-" : ""
  return sign + "Rp " + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

// Address the notification to the admin who triggered the request so it
// shows under their bell (the drawer also matches broadcast "").
export const feedRecipient = (req: MedusaRequest): string => {
  const auth = req.auth_context as { actor_id?: string } | undefined
  return auth?.actor_id || ""
}

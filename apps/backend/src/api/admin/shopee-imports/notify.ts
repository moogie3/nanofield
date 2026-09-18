import type { MedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// Posts into the admin navbar bell (Notification Center reads channel
// "feed" addressed to the admin user id/email). The local feed provider
// persists without sending anywhere — the bell IS the delivery.
// Never throws: feed must not break the operation it reports on.
// Customer bell items use the same channel with to = customer email
// (lowercased) and orderId in data for deep-linking; broadcast "" rows are
// store-wide announcements shown to every logged-in customer.
export const notifyFeed = async (
  scope: MedusaRequest["scope"],
  opts: {
    to?: string
    title: string
    description?: string
    data?: { orderId?: string; link?: string; broadcast?: boolean }
  }
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
        ...(opts.data?.orderId ? { orderId: opts.data.orderId } : {}),
        ...(opts.data?.link ? { link: opts.data.link } : {}),
        ...(opts.data?.broadcast ? { broadcast: true } : {}),
      },
    })
  } catch {
    // bell unavailable — the job page still shows the full report
  }
}

// Customer email through whichever email provider is active (Resend in
// production, Mailtrap sandbox in dev — see medusa-config.ts). Skips
// silently with no recipient; never throws: a failed email must not break
// the order operation that triggered it.
export const notifyCustomer = async (
  scope: MedusaRequest["scope"],
  opts: {
    to?: string | null
    template: string
    data?: Record<string, unknown>
  }
) => {
  if (!opts.to) {
    return
  }
  try {
    const notificationModule = scope.resolve(Modules.NOTIFICATION)
    await notificationModule.createNotifications({
      to: opts.to,
      channel: "email",
      template: opts.template,
      data: opts.data || {},
    })
  } catch {
    // email unavailable (e.g. no provider configured) — order flow first
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
  const auth = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context
  return auth?.actor_id || ""
}

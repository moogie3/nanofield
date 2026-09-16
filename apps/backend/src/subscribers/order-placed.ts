import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { formatIDR, notifyCustomer, notifyFeed } from "../api/admin/shopee-imports/notify"

// Money-moving order events only: placed + canceled. order.updated is
// deliberately excluded — it fires on routine touches and would bury the
// bell. One notification per order event, broadcast to all admins.
export default async function orderActivityHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const { name, data } = event as unknown as {
    name: string
    data: { id: string }
  }
  const canceled = name === "order.canceled"

  let title = canceled ? "Order canceled" : "New order placed"
  let description = canceled
    ? `Order ${data.id} was canceled.`
    : `Order ${data.id} was placed.`
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = (await query.graph({
      entity: "order",
      fields: ["id", "display_id", "total", "currency_code", "email"],
      filters: { id: data.id },
    })) as {
      data: {
        id: string
        display_id: number
        total: number | string
        currency_code: string
        email?: string | null
      }[]
    }
    const order = orders?.[0]
    if (order) {
      title = canceled
        ? `Order #${order.display_id} canceled`
        : `New order #${order.display_id}`
      description = canceled
        ? `Total was ${formatIDR(order.total)}. Check payment capture/void.`
        : `Total ${formatIDR(order.total)}. Open Orders to fulfill.`
      await notifyCustomer(container, {
        to: order.email,
        template: canceled
          ? "nanofield-order-canceled"
          : "nanofield-order-confirmation",
        data: {
          displayId: order.display_id,
          totalFormatted: formatIDR(order.total),
        },
      })
      // Customer bell mirrors the email (keyed by lowercased email so the
      // store route can match the logged-in customer). Guarded: an empty
      // to would broadcast to every admin AND every customer.
      if (order.email) {
        await notifyFeed(container, {
          to: order.email.toLowerCase(),
          title: canceled
            ? `Order #${order.display_id} canceled`
            : `Order #${order.display_id} confirmed`,
          description: canceled
            ? `Total was ${formatIDR(order.total)}. Our team will follow up on the payment.`
            : `Total ${formatIDR(order.total)}. We will notify you when it ships.`,
          data: { orderId: data.id },
        })
      }
    }
  } catch {
    // fall back to the id-only text above — the bell still fires
  }
  await notifyFeed(container, { to: "", title, description })
}

export const config: SubscriberConfig = {
  event: ["order.placed", "order.canceled"],
}

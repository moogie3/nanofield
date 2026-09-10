import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { formatIDR, notifyFeed } from "../api/admin/shopee-imports/notify"

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
      fields: ["id", "display_id", "total", "currency_code"],
      filters: { id: data.id },
    })) as {
      data: {
        id: string
        display_id: number
        total: number | string
        currency_code: string
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
    }
  } catch {
    // fall back to the id-only text above — the bell still fires
  }
  await notifyFeed(container, { to: "", title, description })
}

export const config: SubscriberConfig = {
  event: ["order.placed", "order.canceled"],
}

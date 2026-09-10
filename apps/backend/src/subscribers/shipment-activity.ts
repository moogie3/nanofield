import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyFeed } from "../api/admin/shopee-imports/notify"

// Shipment pipeline per order: packed → shipped → AWB entered. One bell
// note each, broadcast to all admins. Volume is one note per step per
// order — the same scale as order.placed, never import-like floods.
// Delivery confirmation happens outside the system (manual AWB), so there
// is no delivered event to listen for.
type OrderLite = {
  id: string
  display_id: number
}

const orderDisplay = async (
  container: SubscriberArgs<{ id: string }>["container"],
  orderId: string
): Promise<OrderLite | null> => {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = (await query.graph({
      entity: "order",
      fields: ["id", "display_id"],
      filters: { id: orderId },
    })) as { data: OrderLite[] }
    return orders?.[0] ?? null
  } catch {
    return null
  }
}

export default async function shipmentActivityHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; order_id?: string }>) {
  const { name, data } = event as unknown as {
    name: string
    data: { id: string; order_id?: string; order?: { id: string } }
  }

  // order.* events carry the order id as data.id; shipment.created carries
  // order_id on the shipment record.
  const orderId = data.order_id ?? data.order?.id ?? data.id
  const order = orderId ? await orderDisplay(container, orderId) : null
  const ref = order ? `Order #${order.display_id}` : "An order"

  if (name === "order.fulfillment_created") {
    await notifyFeed(container, {
      to: "",
      title: `${ref} packed`,
      description: "Fulfillment created. Mark as shipped once the courier picks up.",
    })
    return
  }

  if (name === "order.fulfillment_canceled") {
    await notifyFeed(container, {
      to: "",
      title: `Fulfillment canceled for ${ref.toLowerCase()}`,
      description: "Stock released. Re-fulfill from the order page when ready.",
    })
    return
  }

  if (name === "shipment.created") {
    await notifyFeed(container, {
      to: "",
      title: `${ref} shipped`,
      description:
        "Courier handoff recorded. The AWB is booked manually — enter tracking on the shipment.",
    })
    return
  }

  // fulfillment.fulfillment-label.created: the AWB tracking number was
  // entered. The label payload carries no order reference, so this stays
  // generic — it still answers "did the AWB get entered?".
  await notifyFeed(container, {
    to: "",
    title: "Tracking number added",
    description: "An AWB was entered on a fulfillment — open the order to copy it.",
  })
}

export const config: SubscriberConfig = {
  event: [
    "order.fulfillment_created",
    "order.fulfillment_canceled",
    "shipment.created",
    "fulfillment.fulfillment-label.created",
  ],
}

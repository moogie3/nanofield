import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyCustomer, notifyFeed } from "../api/admin/shopee-imports/notify"

// Shipment pipeline per order: packed → shipped → AWB entered. One bell
// note each, broadcast to all admins. Volume is one note per step per
// order — the same scale as order.placed, never import-like floods.
// Delivery confirmation happens outside the system (manual AWB), so there
// is no delivered event to listen for.
type OrderLite = {
  id: string
  display_id: number
  email?: string | null
  courier?: string | null
}

const orderDisplay = async (
  container: SubscriberArgs<{ id: string }>["container"],
  orderId: string
): Promise<OrderLite | null> => {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = (await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email", "shipping_methods.name"],
      filters: { id: orderId },
    })) as unknown as {
      data: {
        id: string
        display_id: number
        email?: string | null
        shipping_methods?: { name?: string | null }[]
      }[]
    }
    const hit = orders?.[0]
    if (!hit) {
      return null
    }
    return {
      id: hit.id,
      display_id: hit.display_id,
      email: hit.email,
      courier: hit.shipping_methods?.[0]?.name ?? null,
    }
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
    // The AWB itself is entered separately (fulfillment label), so the
    // email goes out without it and points at support for the number.
    if (order) {
      await notifyCustomer(container, {
        to: order.email,
        template: "nanofield-order-shipped",
        data: {
          displayId: order.display_id,
          ...(order.courier ? { courier: order.courier } : {}),
        },
      })
      if (order.email) {
        await notifyFeed(container, {
          to: order.email.toLowerCase(),
          title: `${ref} shipped`,
          description: order.courier
            ? `Handed to ${order.courier}. The tracking number appears here once entered.`
            : "Handed to the courier. The tracking number appears here once entered.",
          data: { orderId: order.id },
        })
      }
    }
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

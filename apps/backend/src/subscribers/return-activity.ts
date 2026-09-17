import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyCustomer, notifyFeed } from "../api/admin/shopee-imports/notify"

// Return / claim / exchange lifecycle. One bell note per event, both sides:
// broadcast to all admins (operator copy) + customer feed keyed by
// lowercased order email with orderId for deep-linking (customer copy).
// No customer EMAIL here — the resend templates only cover confirmation /
// shipped / delivered / canceled; return emails would need new templates
// (out of scope).
// Refunds have no customer-friendly order event in this Medusa version, so
// the received copy promises the refund instead of announcing it.
type OrderLite = {
  id: string
  display_id: number
  email?: string | null
}

const orderDisplay = async (
  container: SubscriberArgs<{ id: string }>["container"],
  orderId: string
): Promise<OrderLite | null> => {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = (await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email"],
      filters: { id: orderId },
    })) as {
      data: {
        id: string
        display_id: number
        email?: string | null
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
    }
  } catch {
    return null
  }
}

export default async function returnActivityHandler({
  event,
  container,
}: SubscriberArgs<{ order_id?: string }>) {
  const { name, data } = event as unknown as {
    name: string
    data: { order_id?: string; id?: string }
  }

  const orderId = data.order_id ?? data.id
  const order = orderId ? await orderDisplay(container, orderId) : null
  const ref = order ? `Order #${order.display_id}` : "An order"

  const copy: Record<string, { label: string; admin: string; customer: string }> = {
    "order.return_requested": {
      label: "return requested",
      admin: `${ref} return requested. Review and confirm in the order page.`,
      customer: `Return request received for ${ref.toLowerCase()}. Our team will review it shortly.`,
    },
    "order.return_received": {
      label: "return received",
      admin: `${ref} return received. Inspect the items, then issue the refund.`,
      customer: `${ref} return received. The refund will follow to your original payment method.`,
    },
    "order.claim_created": {
      label: "claim filed",
      admin: `${ref} claim filed. Review the claim in the order page.`,
      customer: `Claim filed for ${ref.toLowerCase()}. Our team will follow up with next steps.`,
    },
    "order.exchange_created": {
      label: "exchange created",
      admin: `${ref} exchange created. Fulfill the replacement items.`,
      customer: `Exchange created for ${ref.toLowerCase()}. We will ship the replacement once ready.`,
    },
  }
  const text = copy[name]
  if (!text) {
    return
  }

  const title = `${ref} — ${text.label}`
  await notifyFeed(container, { to: "", title, description: text.admin })
  if (order?.email) {
    await notifyFeed(container, {
      to: order.email.toLowerCase(),
      title,
      description: text.customer,
      data: { orderId: order.id },
    })
    // Inbox twin of the bell note (Mailtrap in dev, Resend in prod).
    // Template per event; claim + exchange share the update template.
    const template =
      name === "order.return_requested"
        ? "nanofield-return-requested"
        : name === "order.return_received"
          ? "nanofield-return-received"
          : "nanofield-return-update"
    await notifyCustomer(container, {
      to: order.email,
      template,
      data: {
        displayId: order.display_id,
        ...(name === "order.exchange_created" ? { kind: "exchange" } : {}),
      },
    })
  }
}

export const config: SubscriberConfig = {
  event: [
    "order.return_requested",
    "order.return_received",
    "order.claim_created",
    "order.exchange_created",
  ],
}

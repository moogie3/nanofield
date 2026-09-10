import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { generateReceiptHtml } from "./template"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const orderId = req.params.id
  if (!orderId) {
    res.status(400).send("Order ID is required")
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "*",
        "customer.*",
        "shipping_address.*",
        "billing_address.*",
        "items.*",
        "items.variant.*",
        "items.variant.product.*",
        "payment_collections.*",
        "payment_collections.payments.*",
        "fulfillments.*",
        "fulfillments.items.*",
        "fulfillments.shipping_method.*",
      ],
      filters: { id: orderId },
    })

    const order = orders?.[0]
    if (!order) {
      res.status(404).send("Order not found")
      return
    }

    const html = generateReceiptHtml(order)
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.send(html)
  } catch (e) {
    res.status(500).send(`Error generating receipt: ${(e as Error).message}`)
  }
}
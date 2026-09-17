import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { generateReceiptHtml } from "./template"
import { senderDefaults } from "../../../sender-profile/route"

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

    // Admin-managed sender block (first row wins); env defaults when none.
    // Never throws the label: a missing module still prints with env values.
    let sender = senderDefaults()
    try {
      const resolve = req.scope.resolve as unknown as (
        key: string
      ) => {
        listSenderProfiles: () => Promise<
          { name: string; phone: string; address_1: string; city: string; province: string; country_code: string }[]
        >
      } | null
      for (const key of ["sender_profile", "senderProfileModuleService"]) {
        try {
          const svc = resolve(key)
          if (svc && typeof svc.listSenderProfiles === "function") {
            const rows = await svc.listSenderProfiles()
            if (rows[0]) {
              const r = rows[0]
              sender = {
                name: r.name,
                phone: r.phone,
                address_1: r.address_1,
                city: r.city,
                province: r.province,
                country_code: r.country_code,
              }
            }
            break
          }
        } catch {
          // try the next key
        }
      }
    } catch {
      // env defaults stand
    }

    const html = generateReceiptHtml(order, {
      first_name: sender.name,
      last_name: "",
      phone: sender.phone,
      address_1: sender.address_1,
      city: sender.city,
      province: sender.province,
      country_code: sender.country_code,
    })
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.send(html)
  } catch (e) {
    res.status(500).send(`Error generating receipt: ${(e as Error).message}`)
  }
}
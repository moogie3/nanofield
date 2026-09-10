import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "payment_collections.*",
      "payment_collections.payments.*",
      "payments.*"
    ],
    filters: { id: "order_01M24W4TZEE2YWHGP8SKNV0X7J" } // from the screenshot url
  })
  res.json(orders)
}

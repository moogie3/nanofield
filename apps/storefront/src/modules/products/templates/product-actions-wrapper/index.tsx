import { listProducts } from "@lib/data/products"
import { retrieveCustomer } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  // Price-on-login gate: guests get the price CTA + intent-gate modal.
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <ProductActions
      product={product}
      region={region}
      showPrices={!!customer}
    />
  )
}

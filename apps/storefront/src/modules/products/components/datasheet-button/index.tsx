import { getDatasheetInfo } from "@lib/util/product-datasheet"
import { HttpTypes } from "@medusajs/types"

/**
 * "View datasheet" button. Rendered under the product image on the product
 * page. Returns null when the product has no document and no searchable
 * identifier (or is opted out via `no_datasheet`) — server-safe.
 */
export default function DatasheetButton({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const info = getDatasheetInfo(product)

  if (!info) {
    return null
  }

  return (
    <a
      href={info.href}
      target="_blank"
      rel="noreferrer"
      className="flex h-10 w-full items-center justify-center rounded-md border border-border text-sm font-medium transition-colors hover:border-primary hover:text-primary"
    >
      View datasheet ↗
    </a>
  )
}

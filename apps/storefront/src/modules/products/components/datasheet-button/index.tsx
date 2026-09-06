import { getDatasheetInfo } from "@lib/util/product-datasheet"
import { HttpTypes } from "@medusajs/types"

/**
 * Datasheet button under the product image. Returns null for hand tools,
 * merch, and anything without a document or explicit part identifier
 * (see `getDatasheetInfo`) — server-safe. Labels honestly: direct PDF
 * vs. identifier search.
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
      {info.isDirect ? "View datasheet ↗" : "Find datasheet ↗"}
    </a>
  )
}

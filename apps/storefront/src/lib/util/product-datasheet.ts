import { HttpTypes } from "@medusajs/types"

export type DatasheetInfo = {
  href: string
  /** Identifier used for fallback search links (MPN, part number, title). */
  partLabel: string
  /** True when href is the manufacturer document itself, not a search page. */
  isDirect: boolean
}

const metaStr = (
  metadata: Record<string, unknown>,
  key: string,
): string | null => {
  const value = metadata[key]
  return typeof value === "string" && value ? value : null
}

/**
 * Single source of truth for "does this product get datasheet UI, and where
 * does it point". Category-agnostic on purpose — no hardcoded category or
 * semiconductor heuristics:
 *
 * 1. `no_datasheet === "true"` in metadata → never. Use for hand tools,
 *    consumables (solder wire, wick), merch, or anything without documents.
 * 2. `datasheet_url` → always links it, whatever the category. A branded
 *    power module or soldering station with a real PDF keeps its button even
 *    though it is not a semiconductor.
 * 3. Otherwise `mpn` / `datasheet_search` / `part_number` → fallback to an
 *    alldatasheet search for that identifier.
 * 4. No identifiers at all → no datasheet UI (never a dead search link).
 */
export function getDatasheetInfo(
  product: HttpTypes.StoreProduct,
): DatasheetInfo | null {
  const metadata = (product.metadata || {}) as Record<string, unknown>

  if (metadata.no_datasheet === "true") {
    return null
  }

  const directUrl = metaStr(metadata, "datasheet_url")
  const partLabel =
    metaStr(metadata, "mpn") ||
    metaStr(metadata, "datasheet_search") ||
    metaStr(metadata, "part_number") ||
    (typeof product.title === "string" && product.title) ||
    (typeof product.handle === "string" && product.handle) ||
    ""

  if (directUrl) {
    return { href: directUrl, partLabel, isDirect: true }
  }

  if (!partLabel) {
    return null
  }

  return {
    href: `https://www.alldatasheet.com/search.jsp?searchword=${encodeURIComponent(
      partLabel,
    )}`,
    partLabel,
    isDirect: false,
  }
}

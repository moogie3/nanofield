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
 * does it point". Strict by default — alldatasheet is a semiconductor
 * archive, so search-fallback links are allowlisted, not assumed:
 *
 * 1. `no_datasheet === "true"` in metadata → never. Hand tools,
 *    consumables (solder wire, wick), merch, anything without documents.
 * 2. `datasheet_url` → always links it, whatever the product. A module
 *    board, PSU, or soldering station with a real PDF keeps its button.
 * 3. Otherwise the product must be explicitly flagged `is_semiconductor
 *    === "true"` (or true — set by the Shopee importer from the SKU
 *    prefix, or by hand in the admin) AND carry an identifier (`mpn` /
 *    `datasheet_search` / `part_number`) → alldatasheet search fallback.
 *    Transformers, module boards, power supplies, soldering irons, solder,
 *    tools, and anything unflagged get nothing.
 * 4. Display title/handle are NEVER used as search terms — no identifiers
 *    means no datasheet UI (never a dead or misleading search link).
 */
export function getDatasheetInfo(
  product: HttpTypes.StoreProduct,
): DatasheetInfo | null {
  const metadata = (product.metadata || {}) as Record<string, unknown>

  if (metadata.no_datasheet === "true") {
    return null
  }

  const directUrl = metaStr(metadata, "datasheet_url")

  if (directUrl) {
    const partLabel =
      metaStr(metadata, "mpn") ||
      metaStr(metadata, "datasheet_search") ||
      metaStr(metadata, "part_number") ||
      ""
    return { href: directUrl, partLabel, isDirect: true }
  }

  if (
    metadata.is_semiconductor !== "true" &&
    metadata.is_semiconductor !== true
  ) {
    return null
  }

  const partLabel =
    metaStr(metadata, "mpn") ||
    metaStr(metadata, "datasheet_search") ||
    metaStr(metadata, "part_number") ||
    ""

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

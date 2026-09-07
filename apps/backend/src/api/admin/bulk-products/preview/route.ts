import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  apiGet,
  forwardAuth,
  runPool,
  selfBaseUrl,
} from "../../_lib/admin-fetch"

export type BulkPreviewRow = {
  sku: string
  found: boolean
  productId?: string
  productTitle?: string
  handle?: string
  status?: string
  variantId?: string
  currentStock?: number
}

// Resolves one SKU to its inventory item (for stock) and its product +
// variant (for display and delete). The two lookups are independent, so
// they run in parallel. Never writes.
export const resolveSku = async (
  baseUrl: string,
  headers: Record<string, string>,
  locationId: string,
  sku: string
): Promise<BulkPreviewRow> => {
  const row: BulkPreviewRow = { sku, found: false }

  const lookupInventory = async () => {
    try {
      const inv = (await apiGet(
        baseUrl,
        headers,
        `/admin/inventory-items?q=${encodeURIComponent(sku)}&limit=20`
      )) as { inventory_items?: { id: string; sku: string }[] }
      const item = (inv.inventory_items || []).find((i) => i.sku === sku)
      if (!item) {
        return
      }
      row.found = true
      const levels = (await apiGet(
        baseUrl,
        headers,
        `/admin/inventory-items/${item.id}/location-levels`
      )) as {
        inventory_levels?: {
          id: string
          location_id: string
          stocked_quantity: number
        }[]
      }
      row.currentStock = (levels.inventory_levels || []).find(
        (l) => l.location_id === locationId
      )?.stocked_quantity
    } catch {
      // best-effort; the product lookup may still hit
    }
  }

  const lookupProduct = async () => {
    try {
      const prods = (await apiGet(
        baseUrl,
        headers,
        `/admin/products?q=${encodeURIComponent(
          sku
        )}&limit=20&fields=id,title,handle,status,*variants`
      )) as {
        products?: {
          id: string
          title: string
          handle: string
          status: string
          variants?: { id: string; sku: string }[]
        }[]
      }
      for (const p of prods.products || []) {
        const v = (p.variants || []).find((vv) => vv.sku === sku)
        if (v) {
          row.found = true
          row.productId = p.id
          row.productTitle = p.title
          row.handle = p.handle
          row.status = p.status
          row.variantId = v.id
          break
        }
      }
    } catch {
      // best-effort; the inventory hit may still stand
    }
  }

  await Promise.all([lookupInventory(), lookupProduct()])
  return row
}

// POST /admin/bulk-products/preview — { items: [{ sku, quantity? }] }.
// quantity is echoed for set-stock; resolution only, no writes.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as {
    items?: { sku?: string; quantity?: number }[]
  }
  const items = (body.items || [])
    .map((i) => ({
      sku: String(i.sku || "").trim(),
      quantity: i.quantity,
    }))
    .filter((i) => i.sku)
    .slice(0, 5000)

  if (items.length === 0) {
    res.status(400).json({ message: "at least one SKU is required" })
    return
  }

  const baseUrl = selfBaseUrl()
  const headers = forwardAuth(req)
  const { stock_locations } = (await apiGet(
    baseUrl,
    headers,
    "/admin/stock-locations?limit=10"
  )) as { stock_locations: { id: string }[] }
  const locationId = stock_locations[0]?.id
  if (!locationId) {
    res.status(400).json({ message: "no stock location found" })
    return
  }

  const rows: BulkPreviewRow[] = await runPool(items, 8, (item) =>
    resolveSku(baseUrl, headers, locationId, item.sku)
  )

  res.json({
    rows,
    quantities: items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
    locationId,
  })
}

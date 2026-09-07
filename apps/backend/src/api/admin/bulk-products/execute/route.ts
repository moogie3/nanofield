import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { feedRecipient, notifyFeed } from "../../shopee-imports/notify"
import {
  apiGet,
  apiSend,
  forwardAuth,
  runPool,
  selfBaseUrl,
} from "../../_lib/admin-fetch"
import { resolveSku } from "../preview/route"

export type BulkExecuteReport = {
  action: "set-stock" | "delete"
  processed: number
  stockSet?: number
  deletedProducts?: number
  deletedSkus?: number
  unmatched: string[]
  errors: string[]
}

const setStock = async (
  baseUrl: string,
  headers: Record<string, string>,
  locationId: string,
  inventorySku: string,
  stock: number
): Promise<"set" | "missing-item"> => {
  const inv = (await apiGet(
    baseUrl,
    headers,
    `/admin/inventory-items?q=${encodeURIComponent(inventorySku)}&limit=20`
  )) as { inventory_items?: { id: string; sku: string }[] }
  const item = (inv.inventory_items || []).find((i) => i.sku === inventorySku)
  if (!item) {
    return "missing-item"
  }
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
  const existing = (levels.inventory_levels || []).find(
    (l) => l.location_id === locationId
  )
  if (existing) {
    if (existing.stocked_quantity !== stock) {
      await apiSend(
        baseUrl,
        headers,
        "POST",
        "/admin/inventory-items/location-levels/batch",
        { update: [{ id: existing.id, stocked_quantity: stock }] }
      )
    }
  } else {
    await apiSend(
      baseUrl,
      headers,
      "POST",
      "/admin/inventory-items/location-levels/batch",
      {
        create: [
          {
            inventory_item_id: item.id,
            location_id: locationId,
            stocked_quantity: stock,
          },
        ],
      }
    )
  }
  return "set"
}

// POST /admin/bulk-products/execute
// { action: "set-stock" | "delete", items: [{ sku, quantity? }] }
// set-stock writes quantity as the stocked level at the first stock
// location. delete removes each matched product once (SKUs sharing a
// product delete it together). Always returns a full report + bell note.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as {
    action?: string
    items?: { sku?: string; quantity?: number }[]
  }
  const action = body.action === "delete" ? "delete" : "set-stock"
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
  if (action === "set-stock" && items.some((i) => !Number.isInteger(i.quantity) || (i.quantity as number) < 0)) {
    res
      .status(400)
      .json({ message: "set-stock needs a whole quantity >= 0 on every row" })
    return
  }

  const recipient = feedRecipient(req)
  const actionLabel = action === "set-stock" ? "stock adjust" : "delete"

  try {
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

    const report: BulkExecuteReport = {
      action,
      processed: items.length,
      unmatched: [],
      errors: [],
    }
    if (action === "set-stock") {
      report.stockSet = 0
    } else {
      report.deletedProducts = 0
      report.deletedSkus = 0
    }

    const seenProducts = new Set<string>()

    // 8-way parallel: 3000+ SKU jobs finish in ~1-3 minutes instead of 10+.
    // Per-item try/catch keeps one bad row from failing the batch. The delete
    // branch re-resolves each SKU (fresh product ids), deduping products so
    // SKUs sharing a product delete it together exactly once.
    await runPool(items, 8, async (item) => {
      try {
        if (action === "set-stock") {
          const outcome = await setStock(
            baseUrl,
            headers,
            locationId,
            item.sku,
            item.quantity as number
          )
          if (outcome === "set") {
            report.stockSet!++
          } else {
            report.unmatched.push(item.sku)
          }
        } else {
          const row = await resolveSku(baseUrl, headers, locationId, item.sku)
          if (!row.productId) {
            report.unmatched.push(item.sku)
            return
          }
          if (!seenProducts.has(row.productId)) {
            seenProducts.add(row.productId)
            await apiSend(
              baseUrl,
              headers,
              "DELETE",
              `/admin/products/${row.productId}`
            )
            report.deletedProducts!++
          }
          report.deletedSkus!++
        }
      } catch (e) {
        report.errors.push(`${item.sku}: ${(e as Error).message}`)
      }
    })

    const summary =
      action === "set-stock"
        ? `${report.stockSet} SKU(s) stock set, ${report.unmatched.length} unmatched, ${report.errors.length} errors`
        : `${report.deletedProducts} product(s) deleted (${report.deletedSkus} SKU rows), ${report.unmatched.length} unmatched, ${report.errors.length} errors`
    await notifyFeed(req.scope, {
      to: recipient,
      title: `Bulk ${actionLabel} finished`,
      description: `${summary}.`,
    })

    res.json({ report })
  } catch (e) {
    const message = (e as Error).message
    await notifyFeed(req.scope, {
      to: recipient,
      title: `Bulk ${actionLabel} failed`,
      description: message,
    })
    res.status(500).json({ message })
  }
}

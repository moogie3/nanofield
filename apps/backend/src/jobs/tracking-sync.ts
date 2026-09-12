import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { markOrderFulfillmentAsDeliveredWorkflow } from "@medusajs/core-flows"
import { notifyFeed } from "../api/admin/shopee-imports/notify"
import {
  normalizeCourier,
  trackWaybill,
} from "../modules/rajaongkir-fulfillment/tracking"

// Auto-delivery sync: polls RajaOngkir AWB tracking for open shipments and
// marks fulfillments delivered when the courier confirms POD. The storefront
// order card flips to "Delivered" on its own (it reads delivered_at).
//
// Quota discipline: tracking shares the 100 hits/day free tier with checkout
// quotes, so this only polls shipped-but-undelivered fulfillments that already
// carry an AWB, oldest first, capped per run. Entering the AWB stays manual;
// everything after that is automatic. A run never throws — per-shipment
// failures log and the run continues.
const baseUrl = () =>
  (process.env.RAJAONGKIR_BASE_URL ||
    "https://rajaongkir.komerce.id/api/v1").replace(/\/$/, "")

const maxPerRun = () => {
  const n = Number(process.env.TRACKING_SYNC_MAX_PER_RUN ?? 5)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5
}

const minAgeMs = () => {
  const h = Number(process.env.TRACKING_SYNC_MIN_AGE_HOURS ?? 6)
  return (Number.isFinite(h) && h > 0 ? h : 6) * 60 * 60 * 1000
}

const lastFiveDigits = (phone: unknown): string | undefined => {
  if (typeof phone !== "string") {
    return undefined
  }
  const digits = phone.replace(/\D/g, "").slice(-5)
  return digits.length === 5 ? digits : undefined
}

type OpenShipment = {
  orderId: string
  displayId: number
  fulfillmentId: string
  awb: string
  courier: string
  shippedAt: number
  lastPhone?: string
}

export default async function trackingSyncJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  if (process.env.TRACKING_SYNC_ENABLED === "false") {
    return
  }
  const apiKey = process.env.RAJAONGKIR_API_KEY || ""
  if (!apiKey) {
    logger.warn("tracking-sync: skipped, RAJAONGKIR_API_KEY is empty")
    return
  }
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = (await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "shipping_address.phone",
        "fulfillments.id",
        "fulfillments.data",
        "fulfillments.shipped_at",
        "fulfillments.delivered_at",
        "fulfillments.canceled_at",
        "fulfillments.labels.*",
      ],
      pagination: { take: 100 },
    })) as { data: Record<string, unknown>[] }

    const cutoff = Date.now() - minAgeMs()
    const open: OpenShipment[] = []
    for (const order of orders ?? []) {
      const fulfillments = Array.isArray(
        (order as { fulfillments?: unknown }).fulfillments
      )
        ? ((order as { fulfillments: Record<string, unknown>[] }).fulfillments)
        : []
      for (const f of fulfillments) {
        if (!f.shipped_at || f.delivered_at || f.canceled_at) {
          continue
        }
        const shippedAt = new Date(f.shipped_at as string).getTime()
        if (!Number.isFinite(shippedAt) || shippedAt > cutoff) {
          continue
        }
        const labels = Array.isArray(f.labels)
          ? (f.labels as Record<string, unknown>[])
          : []
        const awb =
          labels
            .map((l) => l.tracking_number)
            .find((t) => typeof t === "string" && t.trim()) ?? null
        if (!awb) {
          continue
        }
        const courier = normalizeCourier(
          (f.data as Record<string, unknown> | undefined)?.courier
        )
        if (!courier) {
          continue
        }
        open.push({
          orderId: order.id as string,
          displayId: Number(order.display_id) || 0,
          fulfillmentId: f.id as string,
          awb: (awb as string).trim(),
          courier,
          shippedAt,
          lastPhone: lastFiveDigits(
            (order.shipping_address as { phone?: unknown } | undefined)?.phone
          ),
        })
      }
    }
    open.sort((a, b) => a.shippedAt - b.shippedAt)
    const batch = open.slice(0, maxPerRun())
    if (!batch.length) {
      return
    }
    let delivered = 0
    for (const s of batch) {
      try {
        const tracked = await trackWaybill({
          baseUrl: baseUrl(),
          apiKey,
          awb: s.awb,
          courier: s.courier,
          ...(s.courier === "jne" && s.lastPhone
            ? { lastPhone: s.lastPhone }
            : {}),
        })
        if (!tracked.delivered) {
          continue
        }
        await markOrderFulfillmentAsDeliveredWorkflow(container).run({
          input: { order_id: s.orderId, fulfillment_id: s.fulfillmentId },
        })
        delivered += 1
        await notifyFeed(container, {
          to: "",
          title: `Order #${s.displayId} delivered`,
          description: `Courier ${s.courier.toUpperCase()} confirmed delivery (AWB ${s.awb}).`,
        })
      } catch (e) {
        // Bad AWB / courier outage: log loudly so the AWB gets fixed, keep
        // polling the rest. Costs one quota hit — acceptable at this cap.
        logger.warn(
          `tracking-sync: ${s.awb} (${s.courier}) skipped — ${(e as Error).message}`
        )
      }
    }
    logger.info(
      `tracking-sync: checked ${batch.length} shipment(s), ${delivered} delivered`
    )
  } catch (e) {
    logger.error(`tracking-sync: run failed — ${(e as Error).message}`)
  }
}

export const config = {
  name: "tracking-sync",
  schedule: process.env.TRACKING_SYNC_CRON || "0 */6 * * *",
}

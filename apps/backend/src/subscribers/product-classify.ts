import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { classifySku } from "../api/admin/shopee-imports/engine"

// Auto-flags is_semiconductor on product create/update using the SAME
// classifySku prefix rule as the importer — one rule on every entry path
// (manual create, API, import). Guarded: writes only when the computed value
// differs from what's stored, so this can neither loop nor churn. Silent by
// design (product.* volume is deliberately bell-free).
export default async function productClassifyHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const { data } = event as unknown as { data: { id: string } }
    if (!data?.id) {
      return
    }
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = (await query.graph({
      entity: "product",
      fields: ["id", "handle", "metadata", "variants.sku"],
      filters: { id: data.id },
    })) as {
      data: {
        id: string
        handle: string
        metadata: Record<string, unknown> | null
        variants?: { sku?: string | null }[]
      }[]
    }
    const product = products?.[0]
    if (!product) {
      return
    }
    // Variants may not exist yet at created time — fall back to the handle,
    // whose slug preserves a PREFIX-NNNN lead (ic-0399-… → IC).
    const sku =
      product.variants?.map((v) => v?.sku).find((s) => s && s.trim()) ??
      product.handle ??
      ""
    const want = classifySku(sku).isSemiconductor
    if (product.metadata?.is_semiconductor === want) {
      return
    }
    const productModule = container.resolve(Modules.PRODUCT) as {
      updateProducts: (
        id: string,
        data: { metadata: Record<string, unknown> }
      ) => Promise<unknown>
    }
    await productModule.updateProducts(product.id, {
      metadata: { ...(product.metadata || {}), is_semiconductor: want },
    })
  } catch (e) {
    try {
      const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
        warn: (message: string) => void
      }
      logger.warn(`product-classify: skipped — ${(e as Error).message}`)
    } catch {
      // logging must never break the operation being classified
    }
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}

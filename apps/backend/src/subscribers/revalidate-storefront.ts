import type { SubscriberConfig } from "@medusajs/framework"

// Tells the storefront to drop its cached catalog after product changes,
// so new products, prices, and stock show up without a dev restart.
export default async function revalidateStorefrontHandler() {
  const base = process.env.STOREFRONT_URL
  const secret = process.env.REVALIDATE_SECRET

  if (!base || !secret) {
    return
  }

  await fetch(
    `${base}/api/catalog/revalidate?secret=${encodeURIComponent(secret)}`,
    { method: "POST" }
  ).catch(() => {
    // storefront offline or unreachable — cache refreshes on next boot
  })
}

export const config: SubscriberConfig = {
  // Literal strings: the exported ProductEvents.* constants carry a
  // "product." prefix mismatch and do NOT trigger for categories.
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
  ],
}

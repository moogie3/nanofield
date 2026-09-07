import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyFeed } from "../api/admin/shopee-imports/notify"

// Category create/update/delete. Volume is inherently tiny (a handful of
// categories, not thousands of products), so these are safe to announce —
// including the one-time burst when a first import creates them.
// product.* is deliberately NOT subscribed: imports and bulk tools would
// bury the bell; they post their own summaries instead.
export default async function catalogActivityHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const { name, data } = event as unknown as {
    name: string
    data: { id: string }
  }
  const verb =
    name === "product-category.created"
      ? "created"
      : name === "product-category.deleted"
        ? "deleted"
        : "updated"

  let label = data.id
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: cats } = (await query.graph({
      entity: "product_category",
      fields: ["id", "name", "handle"],
      filters: { id: data.id },
    })) as {
      data: { id: string; name: string; handle: string }[]
    }
    const cat = cats?.[0]
    if (cat) {
      label = `${cat.name} (${cat.handle})`
    }
  } catch {
    // fall back to the id — the bell still fires. (Deleted rows usually
    // miss here since the row is already gone; the verb still tells you.)
  }
  await notifyFeed(container, {
    to: "",
    title: `Category ${verb}`,
    description: label,
  })
}

export const config: SubscriberConfig = {
  event: [
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
  ],
}

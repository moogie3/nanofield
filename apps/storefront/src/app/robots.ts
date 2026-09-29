import type { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"

export default function robots(): MetadataRoute.Robots {
  const base = getBaseURL().replace(/\/$/, "")
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Checkout/account/order flows are private — keep them out of indexes.
      disallow: ["*/checkout", "*/account", "*/cart", "*/order/", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}

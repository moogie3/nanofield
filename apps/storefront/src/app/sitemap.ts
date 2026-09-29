import type { MetadataRoute } from "next"
import { routing } from "@/i18n/routing"
import { getBaseURL } from "@lib/util/env"
import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { listRegions } from "@lib/data/regions"

// Regenerated at most daily — the URL set only changes on catalog edits.
export const revalidate = 86400

const STATIC_PATHS = [
  "",
  "/store",
  "/cart",
  "/checkout",
  "/account",
  "/contact",
  "/faq",
  "/returns",
]

async function productHandles(countryCode: string): Promise<string[]> {
  const handles: string[] = []
  let page = 1
  // Paginate until exhausted (limit 100/page).
  for (;;) {
    const { response, nextPage } = await listProducts({
      countryCode,
      pageParam: page,
      queryParams: { limit: 100, fields: "handle" },
    }).catch(() => ({ response: { products: [], count: 0 }, nextPage: null }))
    for (const p of response.products) {
      if (p.handle) {
        handles.push(p.handle)
      }
    }
    if (nextPage === null) {
      break
    }
    page = nextPage
  }
  return [...new Set(handles)]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseURL().replace(/\/$/, "")
  const locales = routing.locales as unknown as string[]
  const now = new Date()

  const regions = (await listRegions().catch(() => null)) ?? []
  const countryCodes = [
    ...new Set(
      regions.flatMap(
        (r) =>
          r.countries
            ?.map((c) => c.iso_2?.toLowerCase())
            .filter((c): c is string => !!c) ?? []
      )
    ),
  ]

  // Fall back to the default region so the sitemap is never empty when the
  // backend is briefly unreachable.
  if (!countryCodes.length) {
    countryCodes.push(
      (process.env.NEXT_PUBLIC_DEFAULT_REGION || "id").toLowerCase()
    )
  }

  const [collections, categories] = await Promise.all([
    listCollections({ fields: "handle", limit: "100" }).catch(() => ({
      collections: [],
    })),
    listCategories({ limit: 100, fields: "handle" }).catch(() => []),
  ])

  // Product handles are fetched per region (visibility can differ), then
  // crossed with every locale — one URL per language × region × product.
  const handlesByCountry = new Map<string, string[]>()
  await Promise.all(
    countryCodes.map(async (cc) => {
      handlesByCountry.set(cc, await productHandles(cc))
    })
  )

  const urls: MetadataRoute.Sitemap = []
  for (const locale of locales) {
    for (const cc of countryCodes) {
      for (const path of STATIC_PATHS) {
        urls.push({
          url: `${base}/${locale}/${cc}${path}`,
          lastModified: now,
          changeFrequency: path === "" ? "daily" : "weekly",
          priority: path === "" ? 1 : 0.7,
        })
      }
      for (const handle of handlesByCountry.get(cc) ?? []) {
        urls.push({
          url: `${base}/${locale}/${cc}/products/${handle}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        })
      }
    }
    for (const c of collections.collections ?? []) {
      if (!c.handle) {
        continue
      }
      for (const cc of countryCodes) {
        urls.push({
          url: `${base}/${locale}/${cc}/collections/${c.handle}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.6,
        })
      }
    }
    for (const cat of categories ?? []) {
      if (!cat.handle) {
        continue
      }
      for (const cc of countryCodes) {
        urls.push({
          url: `${base}/${locale}/${cc}/categories/${cat.handle}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.6,
        })
      }
    }
  }

  return urls
}

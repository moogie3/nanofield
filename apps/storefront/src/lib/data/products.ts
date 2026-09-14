"use server"

import { sdk } from "@lib/config"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

type ProductListQueryParams = (HttpTypes.FindParams &
  HttpTypes.StoreProductListParams) & {
  options?: string[]
  option_value_id?: string | string[]
}

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: ProductListQueryParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  // force-cache + revalidate (ISR, 5 min): catalog edits/deletes in the
  // admin become visible in the storefront within 5 minutes instead of
  // living in the fetch cache indefinitely. Restart the dev server once to
  // flush entries cached before this window existed.
  const next = {
    ...(await getCacheOptions("products")),
    revalidate: 300,
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * Fetches up to the whole catalog into the Next.js cache and sorts it
 * based on the sortBy parameter. It will then return the paginated
 * products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
  optionValueIds,
  categoryIds,
  spec,
  hasDatasheet,
}: {
  page?: number
  queryParams?: ProductListQueryParams
  sortBy?: SortOptions
  countryCode: string
  optionValueIds?: OptionValueIds
  categoryIds?: string[]
  spec?: string[]
  hasDatasheet?: boolean
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  const limit = queryParams?.limit || 12
  const optionFilters = Array.from(
    new Set((optionValueIds || []).filter(Boolean))
  )
  const categoryFilters = Array.from(
    new Set((categoryIds || []).filter(Boolean))
  )

  const { response: { products } } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      ...(optionFilters.length ? { option_value_id: optionFilters } : {}),
      ...(categoryFilters.length ? { category_id: categoryFilters } : {}),
      // Client-side price sorting needs the full set: fetch up to the
      // whole catalog (Nanofield scale: low thousands) instead of paging.
      limit: 5000,
    },
    countryCode,
  })

  // Spec + datasheet filters run in memory on the fetched set (the store API
  // has no metadata filter): every selected pair must match, so counts and
  // pages stay exact. Pairs are "axis:value" against comma-separated
  // metadata values, case-insensitive.
  const specPairs = (spec || [])
    .map((pair) => {
      const idx = pair.indexOf(":")
      if (idx < 0 || !/^spec_[a-z]+$/.test(pair.slice(0, idx))) {
        return null
      }
      const value = pair.slice(idx + 1).trim().toLowerCase()
      return value ? { axis: pair.slice(0, idx), value } : null
    })
    .filter((p): p is { axis: string; value: string } => !!p)
  const matchesSpecs = (product: HttpTypes.StoreProduct): boolean => {
    if (!specPairs.length && !hasDatasheet) {
      return true
    }
    const metadata = (product.metadata || {}) as Record<string, unknown>
    if (
      hasDatasheet &&
      (metadata.has_datasheet as string | undefined) !== "true"
    ) {
      return false
    }
    return specPairs.every(({ axis, value }) => {
      const raw = metadata[axis]
      if (typeof raw !== "string") {
        return false
      }
      return raw
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .includes(value)
    })
  }
  const filtered = products.filter(matchesSpecs)

  const sortedProducts = sortProducts(filtered, sortBy)

  const pageParam = (page - 1) * limit

  const filteredCount = filtered.length

  const nextPage = filteredCount > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count: filteredCount,
    },
    nextPage,
    queryParams,
  }
}

// Ranked product ids for a search query (Postgres full-text + trigram,
// typo-tolerant). Hydration through listProducts keeps pricing/region logic
// in one place; callers reorder by these ids to preserve rank. Not cached:
// search volume is tiny and the index changes on import.
export const searchProductIds = async (
  query: string,
  limit = 100
): Promise<string[]> => {
  const q = query.trim()
  if (!q) {
    return []
  }
  const { ids } = await sdk.client.fetch<{ ids: string[] }>(
    `/store/search`,
    {
      method: "GET",
      query: { q, limit },
      cache: "no-store",
    }
  )
  return Array.isArray(ids) ? ids : []
}

export type FilterFacets = {
  options: { value: string; count: number; ids: string[] }[]
  specs: { axis: string; value: string; count: number }[]
  datasheetCount: number
}

// Sidebar facet values (Phase 5): distinct option values, spec axis values,
// and the datasheet-flag count across published products, optionally scoped
// to the selected categories. Tiny GROUP BY payload — never product rows.
export const getFilterFacets = async (
  categoryIds?: string[]
): Promise<FilterFacets> => {
  const query: Record<string, unknown> = {}
  if (categoryIds?.length) {
    query.category_id = categoryIds
  }
  try {
    const res = await sdk.client.fetch<FilterFacets>(`/store/facets`, {
      method: "GET",
      query,
      cache: "no-store",
    })
    return {
      options: Array.isArray(res.options) ? res.options : [],
      specs: Array.isArray(res.specs) ? res.specs : [],
      datasheetCount: Number(res.datasheetCount) || 0,
    }
  } catch {
    // Facets are progressive enhancement: a backend hiccup degrades to the
    // category/sort UI rather than breaking the catalog page.
    return { options: [], specs: [], datasheetCount: 0 }
  }
}
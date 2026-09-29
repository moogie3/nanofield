import { Metadata } from "next"
import { pageMeta } from "@lib/util/locale-metadata"

import { searchProductIds } from "@lib/data/products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import {
  parseHasDatasheet,
  parseSpecFilters,
} from "@lib/util/product-spec-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}): Promise<Metadata> {
  const { locale, countryCode } = await params
  return pageMeta(locale, countryCode, "/store", "storeTitle", "storeDesc")
}

type StorePageSearchParams = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  view?: "grid" | "list"
  optionValueIds?: string | string[]
  category?: string | string[]
  spec?: string | string[]
  has_datasheet?: string
  q?: string
}

type Params = {
  searchParams: Promise<StorePageSearchParams>
  params: Promise<{
    locale: string
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page, category, view } = searchParams
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : ""
  const optionValueIds = parseOptionValueIds(searchParams)
  const spec = parseSpecFilters(searchParams)
  const hasDatasheet = parseHasDatasheet(searchParams)
  const categoryIds = Array.isArray(category)
    ? category
    : category
      ? [category]
      : []
  const productsIds = query ? await searchProductIds(query) : undefined

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      view={view === "list" ? "list" : "grid"}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      categoryIds={categoryIds}
      spec={spec}
      hasDatasheet={hasDatasheet}
      query={query || undefined}
      productsIds={productsIds}
    />
  )
}

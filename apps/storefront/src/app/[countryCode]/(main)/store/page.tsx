import { Metadata } from "next"

import { searchProductIds } from "@lib/data/products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Product Catalog",
  description:
    "Browse our catalog of 900+ electronic components, ICs, transistors, and appliance spare parts. Search by part number, filter by specifications.",
}

type StorePageSearchParams = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  view?: "grid" | "list"
  optionValueIds?: string | string[]
  category?: string | string[]
  q?: string
}

type Params = {
  searchParams: Promise<StorePageSearchParams>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page, category, view } = searchParams
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : ""
  const optionValueIds = parseOptionValueIds(searchParams)
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
      query={query || undefined}
      productsIds={productsIds}
    />
  )
}

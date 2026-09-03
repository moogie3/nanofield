import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  categoryIds,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  categoryIds?: string[]
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} />
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-2xl-semi mb-2">Product Catalog</h1>
          <p className="text-ui-fg-subtle text-small-regular max-w-2xl">
            Search by part number (e.g. IC-0399, TRS-0051), filter by category,
            manufacturer, or specifications. 900+ spare parts in stock —
            electronic components (ICs, transistors, MOSFETs, capacitors),
            appliance spare parts, hand tools, repair tools, and more. Your
            universal source for repair & maintenance parts.
          </p>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            categoryIds={categoryIds}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate

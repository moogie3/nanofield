import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { OptionValueIds } from "@lib/util/product-option-filters"
import {
  formatSpecLabel,
  SpecSelection,
} from "@lib/util/product-spec-filters"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

// Fixed page size: 10 rows × 8-col grid. No per-page selector by decision
// (speed + simplicity over choice).
const PRODUCT_LIMIT = 80

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  optionValueIds,
  categoryIds,
  spec,
  hasDatasheet,
  query,
  view,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  optionValueIds?: OptionValueIds
  categoryIds?: string[]
  spec?: SpecSelection
  hasDatasheet?: boolean
  query?: string
  view?: "grid" | "list"
}) {
  const queryParams: PaginatedProductsParams = {
    limit: PRODUCT_LIMIT,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  // Use categoryIds from query params (multiple categories) or fallback to single categoryId
  const finalCategoryIds =
    categoryIds && categoryIds.length > 0
      ? categoryIds
      : categoryId
        ? [categoryId]
        : undefined
  if (finalCategoryIds) {
    queryParams["category_id"] = finalCategoryIds
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const {
    response: { products: fetched, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
    categoryIds: finalCategoryIds,
    spec,
    hasDatasheet,
  })

  // Search ranking wins over the sort dropdown: restore /store/search rank
  // order (listProductsWithSort re-sorts by sortBy). Only applies when the
  // caller passed an ordered id set (i.e. a search query).
  const products =
    productsIds && productsIds.length > 0
      ? [...fetched].sort(
          (a, b) => productsIds.indexOf(a.id) - productsIds.indexOf(b.id)
        )
      : fetched

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  const layout = view === "list" ? "list" : "grid"

  if (products.length === 0) {
    const blockers: string[] = []
    if (query) {
      blockers.push(`the search for \u201c${query}\u201d`)
    }
    for (const pair of spec ?? []) {
      blockers.push(`the ${formatSpecLabel(pair)} filter`)
    }
    if (hasDatasheet) {
      blockers.push("the Has datasheet filter")
    }
    if (optionValueIds?.length) {
      blockers.push("the selected option values")
    }
    if (finalCategoryIds?.length) {
      blockers.push(
        `${finalCategoryIds.length} categor${finalCategoryIds.length === 1 ? "y" : "ies"}`
      )
    }
    return (
      <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center">
        <p className="font-heading text-xl font-bold text-foreground">
          No products match these filters
        </p>
        <p className="text-small-regular max-w-md text-ui-fg-subtle">
          {blockers.length
            ? `Nothing matches ${blockers.join(" + ")} — try removing one filter at a time.`
            : "The selected categories returned nothing — they may have been removed or renamed. Clear the filters to browse the full catalog."}
        </p>
        <a
          href={`/${countryCode}/store`}
          className="inline-flex h-10 items-center rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:opacity-90"
        >
          Show all products
        </a>
      </div>
    )
  }

  return (
    <>
      <ul
        className={
          layout === "grid"
            ? "grid grid-cols-2 w-full small:grid-cols-4 medium:grid-cols-6 large:grid-cols-8 gap-x-3 gap-y-5"
            : "flex flex-col w-full gap-3"
        }
        data-testid="products-list"
      >
        {products.map((p) => {
          return (
            <li key={p.id}>
              <ProductPreview
                product={p}
                region={region}
                countryCode={countryCode}
                layout={layout}
              />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}

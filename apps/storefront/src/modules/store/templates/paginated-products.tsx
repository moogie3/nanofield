import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { OptionValueIds } from "@lib/util/product-option-filters"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const PRODUCT_LIMIT = 48

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
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
    categoryIds: finalCategoryIds,
  })

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  const layout = view === "list" ? "list" : "grid"

  if (products.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center">
        <p className="font-heading text-xl font-bold text-foreground">
          No products match these filters
        </p>
        <p className="text-small-regular max-w-md text-ui-fg-subtle">
          The selected categories returned nothing — they may have been
          removed or renamed. Clear the filters to browse the full catalog.
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

import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { OptionValueIds } from "@lib/util/product-option-filters"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const PRODUCT_LIMIT = 16

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
    limit: 16,
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

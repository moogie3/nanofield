import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import QuickAddButton from "./quick-add"
import HoverPreview from "./hover-preview"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
  countryCode,
  layout = "grid",
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
  countryCode?: string
  layout?: "grid" | "list"
}) {
  // const pricedProduct = await listProducts({
  //   regionId: region.id,
  //   queryParams: { id: [product.id!] },
  // }).then(({ response }) => response.products[0])

  // if (!pricedProduct) {
  //   return null
  // }

  const { cheapestPrice } = getProductPrice({
    product,
  })

  const metadata = (product.metadata ?? {}) as Record<string, any>
  const firstVariant = product.variants?.[0]
  const partNumber = String(
    metadata.part_number || firstVariant?.sku || product.handle,
  )
  // Same truth as the buy button and specs tab: any purchasable variant.
  const inStock = (product.variants || []).some(
    (v) =>
      v.allow_backorder ||
      (typeof v.inventory_quantity === "number" && v.inventory_quantity > 0)
  )
  const previewImage = product.thumbnail || product.images?.[0]?.url

  if (layout === "list") {
    const specChips = [
      metadata.manufacturer,
      metadata.package_case,
      metadata.mounting_type,
    ].filter((v): v is string => typeof v === "string" && v.length > 0)
    return (
      <HoverPreview image={previewImage} title={product.title}>
        <div
          data-testid="product-wrapper"
          className="group flex flex-row items-center gap-4 rounded-2xl border border-border bg-card p-3 transition-shadow duration-200 hover:shadow-lg"
        >
          <LocalizedClientLink
            href={`/products/${product.handle}`}
            className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ui-bg-subtle dark:bg-muted"
          >
            <div className="h-full w-full [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-110">
              <Thumbnail
                thumbnail={product.thumbnail}
                images={product.images}
                size="square"
                isFeatured={isFeatured}
                placeholderSize="card"
                className="h-full w-full rounded-none border-0 p-0 shadow-none"
              />
            </div>
          </LocalizedClientLink>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="truncate">{partNumber}</span>
              <span
                title={inStock ? "In stock" : "Out of stock"}
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  inStock ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </span>
            <LocalizedClientLink href={`/products/${product.handle}`}>
              <Text
                className="line-clamp-1 text-[13px] font-medium text-ui-fg-base hover:text-primary"
                data-testid="product-title"
              >
                {product.title}
              </Text>
            </LocalizedClientLink>
            {specChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {specChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex min-w-0 items-center gap-x-2">
              {cheapestPrice && (
                <PreviewPrice price={cheapestPrice} className="text-[13px]" />
              )}
            </div>
            {firstVariant?.id && countryCode && (
              <QuickAddButton
                variantId={firstVariant.id}
                countryCode={countryCode}
              />
            )}
          </div>
        </div>
      </HoverPreview>
    )
  }

  return (
    <HoverPreview image={previewImage} title={product.title}>
      <div
        data-testid="product-wrapper"
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow duration-200 hover:shadow-lg"
      >
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          className="relative block aspect-square overflow-hidden bg-ui-bg-subtle dark:bg-muted"
        >
          <div className="h-full w-full [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-110">
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="square"
              isFeatured={isFeatured}
              placeholderSize="card"
              className="h-full w-full rounded-none border-0 p-0 shadow-none"
            />
          </div>
        </LocalizedClientLink>
        <div className="flex flex-1 flex-col gap-0.5 p-3">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span className="truncate">{partNumber}</span>
            <span
              title={inStock ? "In stock" : "Out of stock"}
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                inStock ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
          </span>
          <LocalizedClientLink href={`/products/${product.handle}`}>
              <Text
                className="line-clamp-2 min-h-10 text-[13px] font-medium text-ui-fg-base hover:text-primary"
                data-testid="product-title"
              >
              {product.title}
            </Text>
          </LocalizedClientLink>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-x-2">
              {cheapestPrice && (
                <PreviewPrice price={cheapestPrice} className="text-[13px]" />
              )}
            </div>
            {firstVariant?.id && countryCode && (
              <QuickAddButton
                variantId={firstVariant.id}
                countryCode={countryCode}
              />
            )}
          </div>
        </div>
      </div>
    </HoverPreview>
  )
}

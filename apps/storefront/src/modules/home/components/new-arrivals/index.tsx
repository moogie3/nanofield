import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

export default async function NewArrivals({
  region,
}: {
  region: HttpTypes.StoreRegion
  countryCode: string
}) {
  const {
    response: { products },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      limit: 24,
    },
  })

  const recent = [...(products ?? [])]
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    )
    .slice(0, 6)

  if (!recent.length) {
    return null
  }

  return (
    <section className="border-t border-border bg-muted/40">
      <div className="content-container py-8 small:py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
              Fresh stock
            </p>
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground small:text-2xl">
              Recently added
            </h2>
          </div>
          <LocalizedClientLink
            href="/store"
            className="text-small-semi shrink-0 text-ui-fg-subtle hover:text-primary"
          >
            View all →
          </LocalizedClientLink>
        </div>
        <ul className="grid grid-cols-3 gap-x-2 gap-y-3 small:grid-cols-6 small:gap-x-3">
          {recent.map((product) => {
            const metadata = (product.metadata ?? {}) as Record<string, any>
            const partNumber = String(
              metadata.part_number ||
                product.variants?.[0]?.sku ||
                product.handle
            )
            return (
              <li key={product.id}>
                <LocalizedClientLink
                  href={`/products/${product.handle}`}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-ui-bg-subtle dark:bg-muted">
                    <Thumbnail
                      thumbnail={product.thumbnail}
                      images={product.images}
                      size="square"
                      placeholderSize="card"
                      className="h-full w-full rounded-none border-0 p-0 shadow-none"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-px p-1.5">
                    <span className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {partNumber}
                    </span>
                    <Text className="line-clamp-1 text-xs font-medium leading-4 text-ui-fg-base">
                      {product.title}
                    </Text>
                  </div>
                </LocalizedClientLink>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

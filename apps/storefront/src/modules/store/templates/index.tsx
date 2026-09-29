import { Suspense } from "react"
import { getLocale, getTranslations } from "next-intl/server"

import { OptionValueIds } from "@lib/util/product-option-filters"
import { SpecSelection } from "@lib/util/product-spec-filters"
import PageBackdrop from "@modules/common/components/page-backdrop"
import StoreBanners from "@modules/common/components/store-banners"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import SearchField from "@modules/store/components/search-field"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  view,
  countryCode,
  optionValueIds,
  categoryIds,
  spec,
  hasDatasheet,
  query,
  productsIds,
}: {
  sortBy?: SortOptions
  page?: string
  view?: "grid" | "list"
  countryCode: string
  optionValueIds?: OptionValueIds
  categoryIds?: string[]
  spec?: SpecSelection
  hasDatasheet?: boolean
  query?: string
  productsIds?: string[]
}) => {
  const locale = await getLocale()
  const t = await getTranslations("store")
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  // Remount the product grid whenever the filter signature changes so a
  // filter reset can never reuse a stale Suspense boundary / cached render.
  const gridKey = JSON.stringify({
    categories: [...(categoryIds ?? [])].sort(),
    options: optionValueIds ?? [],
    spec: [...(spec ?? [])].sort(),
    datasheet: hasDatasheet ?? false,
    sort,
    page: pageNumber,
    view: view ?? "grid",
    q: query ?? "",
  })

  return (
    <div className="relative" data-testid="category-container">
      <PageBackdrop />
      <StoreBanners />
      <div className="content-container relative py-6">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(color-mix(in oklch, var(--primary) 30%, transparent) 1px, transparent 1.5px)",
            backgroundSize: "32px 32px",
            maskImage:
              "linear-gradient(to right, black 0%, black 45%, transparent 85%)",
            WebkitMaskImage:
              "linear-gradient(to right, black 0%, black 45%, transparent 85%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-3 right-3 select-none whitespace-nowrap font-heading text-[2.5rem] font-bold leading-none tracking-[0.1em] text-transparent small:text-[4rem]"
          style={{ WebkitTextStroke: "1px var(--border)" }}
        >
          MICROCHIP
        </span>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        />
        <div className="relative flex flex-col gap-4 p-6 small:p-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-flex items-center gap-2 text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              {t("indexOnline")}
            </span>
            <span aria-hidden className="text-border">
              /
            </span>
            <span>{t("indexStats")}</span>
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-small-regular max-w-none text-ui-fg-subtle">
            {t("description")}
          </p>
        </div>
      </div>
      <div className="flex flex-col small:flex-row small:items-start small:gap-8">
        <RefinementList sortBy={sort} />
        <div className="w-full">
          <div className="mb-4 flex flex-col gap-3 small:flex-row small:items-center small:justify-between">
            <SearchField initialValue={query ?? ""} />
            {query && (
              <p className="shrink-0 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {t("resultsFor", {
                  count: (productsIds ?? []).length,
                  query,
                })}{" "}
                <a
                  href={`/${locale}/${countryCode}/store`}
                  className="text-primary underline underline-offset-2"
                >
                  {t("clear")}
                </a>
              </p>
            )}
          </div>
          <Suspense key={gridKey} fallback={<SkeletonProductGrid />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              view={view}
              countryCode={countryCode}
              optionValueIds={optionValueIds}
              categoryIds={categoryIds}
              spec={spec}
              hasDatasheet={hasDatasheet}
              query={query}
              productsIds={productsIds}
            />
          </Suspense>
        </div>
      </div>
      </div>
    </div>
  )
}

export default StoreTemplate

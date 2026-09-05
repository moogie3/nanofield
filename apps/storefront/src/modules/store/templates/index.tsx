import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import PageBackdrop from "@modules/common/components/page-backdrop"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  view,
  countryCode,
  optionValueIds,
  categoryIds,
}: {
  sortBy?: SortOptions
  page?: string
  view?: "grid" | "list"
  countryCode: string
  optionValueIds?: OptionValueIds
  categoryIds?: string[]
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div className="relative" data-testid="category-container">
      <PageBackdrop />
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
              Index online
            </span>
            <span aria-hidden className="text-border">
              /
            </span>
            <span>ICs · Transistors · MOSFETs · Passives — 900+ parts indexed</span>
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Product Catalog
          </h1>
          <p className="text-small-regular max-w-none text-ui-fg-subtle">
            Search by part number (e.g. IC-0399, TRS-0051), filter by category,
            manufacturer, or specifications. 900+ spare parts in stock —
            electronic components (ICs, transistors, MOSFETs, capacitors),
            appliance spare parts, hand tools, repair tools, and more. Your
            universal source for repair &amp; maintenance parts.
          </p>
        </div>
      </div>
      <div className="flex flex-col small:flex-row small:items-start small:gap-8">
        <RefinementList sortBy={sort} />
        <div className="w-full">
          <Suspense fallback={<SkeletonProductGrid />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              view={view}
              countryCode={countryCode}
              optionValueIds={optionValueIds}
              categoryIds={categoryIds}
            />
          </Suspense>
        </div>
      </div>
      </div>
    </div>
  )
}

export default StoreTemplate

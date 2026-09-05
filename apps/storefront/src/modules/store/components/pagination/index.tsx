"use client"

import { clx } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function Pagination({
  page,
  totalPages,
  'data-testid': dataTestid
}: {
  page: number
  totalPages: number
  'data-testid'?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Helper function to generate an array of numbers within a range
  const arrayRange = (start: number, stop: number) =>
    Array.from({ length: stop - start + 1 }, (_, index) => start + index)

  // Function to handle page changes
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  // Function to render a page button
  const renderPageButton = (
    p: number,
    label: string | number,
    isCurrent: boolean
  ) => (
    <button
      key={p}
      aria-label={`Go to page ${p}`}
      aria-current={isCurrent ? "page" : undefined}
      className={clx(
        "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors",
        {
          "border-primary bg-primary text-primary-foreground": isCurrent,
          "border-border bg-card text-ui-fg-subtle hover:border-primary hover:text-foreground":
            !isCurrent,
        }
      )}
      disabled={isCurrent}
      onClick={() => handlePageChange(p)}
    >
      {label}
    </button>
  )

  // Function to render ellipsis
  const renderEllipsis = (key: string) => (
    <span
      key={key}
      className="flex h-9 min-w-9 items-center justify-center text-sm text-ui-fg-muted cursor-default"
    >
      ...
    </span>
  )

  // Function to render page buttons based on the current page and total pages
  const renderPageButtons = () => {
    const buttons = []

    if (totalPages <= 7) {
      // Show all pages
      buttons.push(
        ...arrayRange(1, totalPages).map((p) =>
          renderPageButton(p, p, p === page)
        )
      )
    } else {
      // Handle different cases for displaying pages and ellipses
      if (page <= 4) {
        // Show 1, 2, 3, 4, 5, ..., lastpage
        buttons.push(
          ...arrayRange(1, 5).map((p) => renderPageButton(p, p, p === page))
        )
        buttons.push(renderEllipsis("ellipsis1"))
        buttons.push(
          renderPageButton(totalPages, totalPages, totalPages === page)
        )
      } else if (page >= totalPages - 3) {
        // Show 1, ..., lastpage - 4, lastpage - 3, lastpage - 2, lastpage - 1, lastpage
        buttons.push(renderPageButton(1, 1, 1 === page))
        buttons.push(renderEllipsis("ellipsis2"))
        buttons.push(
          ...arrayRange(totalPages - 4, totalPages).map((p) =>
            renderPageButton(p, p, p === page)
          )
        )
      } else {
        // Show 1, ..., page - 1, page, page + 1, ..., lastpage
        buttons.push(renderPageButton(1, 1, 1 === page))
        buttons.push(renderEllipsis("ellipsis3"))
        buttons.push(
          ...arrayRange(page - 1, page + 1).map((p) =>
            renderPageButton(p, p, p === page)
          )
        )
        buttons.push(renderEllipsis("ellipsis4"))
        buttons.push(
          renderPageButton(totalPages, totalPages, totalPages === page)
        )
      }
    }

    return buttons
  }

  // Render the component
  const canPrev = page > 1
  const canNext = page < totalPages

  const navButtonClass = (enabled: boolean) =>
    clx(
      "flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium transition-colors",
      {
        "border-border bg-card text-ui-fg-subtle hover:border-primary hover:text-foreground":
          enabled,
        "cursor-not-allowed border-border bg-muted text-ui-fg-muted opacity-60":
          !enabled,
      }
    )

  return (
    <nav
      aria-label="Product catalog pages"
      className="mt-12 flex w-full flex-col items-center gap-3"
    >
      <div className="flex flex-wrap items-center justify-center gap-2" data-testid={dataTestid}>
        <button
          aria-label="Go to previous page"
          className={navButtonClass(canPrev)}
          disabled={!canPrev}
          onClick={() => canPrev && handlePageChange(page - 1)}
        >
          <span aria-hidden>←</span> Prev
        </button>
        {renderPageButtons()}
        <button
          aria-label="Go to next page"
          className={navButtonClass(canNext)}
          disabled={!canNext}
          onClick={() => canNext && handlePageChange(page + 1)}
        >
          Next <span aria-hidden>→</span>
        </button>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-muted">
        Page {page} of {totalPages}
      </p>
    </nav>
  )
}

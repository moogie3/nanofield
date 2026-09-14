"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

import SortProducts, { SortOptions } from "./sort-products"
import CategoryFilter from "./category-filter"
import DatasheetFilter from "./datasheet-filter"
import OptionFilter from "./option-filter"
import SpecFilter from "./spec-filter"
import ViewToggle, { ViewMode } from "./view-toggle"
import { Separator } from "@/components/ui/separator"
import {
  HAS_DATASHEET_QUERY_KEY,
  SPEC_QUERY_KEY,
} from "@lib/util/product-spec-filters"
import { OPTION_VALUE_QUERY_KEY } from "@lib/util/product-option-filters"

const CATEGORY_QUERY_KEY = "category"

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  hideCategoryFilter?: boolean
  "data-testid"?: string
}

const RefinementList = ({
  sortBy,
  hideCategoryFilter = false,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)

      params.delete("page")

      const queryString = params.toString()
      const currentQuery = searchParams.toString()
      const nextPath = queryString ? `${pathname}?${queryString}` : pathname
      const currentPath = currentQuery
        ? `${pathname}?${currentQuery}`
        : pathname

      if (nextPath !== currentPath) {
        router.push(nextPath)
        // Force server components (product grid) to refetch even when the
        // router considers the navigation a no-op for cached segments.
        router.refresh()
      }
    },
    [pathname, router, searchParams],
  )

  const setQueryParams = (name: string, value: string) =>
    updateQueryParams((params) => params.set(name, value))

  const selectedCategoryIds = useMemo(() => {
    const cats = searchParams.getAll(CATEGORY_QUERY_KEY)
    return cats.length > 0 ? cats : []
  }, [searchParams])

  const setCategoryIds = (categoryIds: string[]) =>
    updateQueryParams((params) => {
      params.delete(CATEGORY_QUERY_KEY)
      categoryIds.forEach((id) => params.append(CATEGORY_QUERY_KEY, id))
    })

  const selectedOptionIds = useMemo(() => {
    return searchParams.getAll(OPTION_VALUE_QUERY_KEY)
  }, [searchParams])

  const setOptionIds = (ids: string[]) =>
    updateQueryParams((params) => {
      params.delete(OPTION_VALUE_QUERY_KEY)
      ids.forEach((id) => params.append(OPTION_VALUE_QUERY_KEY, id))
    })

  const selectedSpecs = useMemo(() => {
    return searchParams.getAll(SPEC_QUERY_KEY)
  }, [searchParams])

  const setSpecs = (specs: string[]) =>
    updateQueryParams((params) => {
      params.delete(SPEC_QUERY_KEY)
      specs.forEach((s) => params.append(SPEC_QUERY_KEY, s))
    })

  const hasDatasheet =
    searchParams.get(HAS_DATASHEET_QUERY_KEY) === "1" ||
    searchParams.get(HAS_DATASHEET_QUERY_KEY)?.toLowerCase() === "true"

  const setHasDatasheet = (checked: boolean) =>
    updateQueryParams((params) => {
      params.delete(HAS_DATASHEET_QUERY_KEY)
      if (checked) {
        params.set(HAS_DATASHEET_QUERY_KEY, "1")
      }
    })

  const view = (
    searchParams.get("view") === "list" ? "list" : "grid"
  ) as ViewMode

  return (
    <div className="flex flex-col gap-5 px-5 py-4 mb-8 w-full small:w-auto small:min-w-[220px] small:sticky small:top-24 self-start rounded-2xl border border-border bg-card">
      <SortProducts
        sortBy={sortBy}
        setQueryParams={setQueryParams}
        data-testid={dataTestId}
      />
      <Separator />
      <ViewToggle view={view} setQueryParams={setQueryParams} />
      {!hideCategoryFilter && (
        <>
          <Separator />
          <CategoryFilter
            categoryIds={selectedCategoryIds}
            onCategoryChange={setCategoryIds}
          />
        </>
      )}
      <Separator />
      <OptionFilter
        selectedIds={selectedOptionIds}
        onSelectionChange={setOptionIds}
        categoryIds={selectedCategoryIds}
      />
      <Separator />
      <SpecFilter
        selectedSpecs={selectedSpecs}
        onSelectionChange={setSpecs}
        categoryIds={selectedCategoryIds}
      />
      <Separator />
      <DatasheetFilter
        checked={hasDatasheet}
        onCheckedChange={setHasDatasheet}
        categoryIds={selectedCategoryIds}
      />
    </div>
  )
}

export default RefinementList

"use client"

import { useEffect, useState } from "react"
import clsx from "clsx"

type OptionFacet = { value: string; count: number; ids: string[] }

type OptionFilterProps = {
  selectedIds?: string[]
  onSelectionChange: (ids: string[]) => void
  categoryIds?: string[]
}

const OptionFilter = ({
  selectedIds = [],
  onSelectionChange,
  categoryIds = [],
}: OptionFilterProps) => {
  const [facets, setFacets] = useState<OptionFacet[]>([])
  const [mounted, setMounted] = useState(false)
  const scopeKey = [...categoryIds].sort().join(",")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchFacets = async () => {
      try {
        const params = new URLSearchParams()
        categoryIds.forEach((id) => params.append("category_id", id))
        const query = params.toString()
        const response = await fetch(
          `/api/facets${query ? `?${query}` : ""}`
        )
        if (response.ok) {
          const data = await response.json()
          setFacets(Array.isArray(data.options) ? data.options : [])
        }
      } catch (error) {
        console.error("Failed to fetch option facets", error)
      }
    }

    fetchFacets()
    // Re-scope when the selected categories change; `scopeKey` keeps the
    // dependency stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey])

  if (!mounted || !facets.length) {
    return null
  }

  const toggleValue = (facet: OptionFacet) => {
    const facetIds = facet.ids.filter(
      (id) => typeof id === "string" && id
    )
    const isSelected = facetIds.some((id) => selectedIds.includes(id))
    const next = isSelected
      ? selectedIds.filter((id) => !facetIds.includes(id))
      : [...selectedIds, ...facetIds]
    onSelectionChange(Array.from(new Set(next)))
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="txt-compact-small-plus text-ui-fg-subtle">
          Options
        </span>
      </div>
      <div className="flex max-h-64 flex-col gap-y-2 overflow-y-auto pr-1">
        {facets.map((facet) => {
          const isSelected = facet.ids.some((id) => selectedIds.includes(id))
          return (
            <div key={facet.value} className="flex items-center gap-2.5 py-1.5">
              <div className="h-5 w-5 shrink-0" />
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleValue(facet)}
                  className="h-4 w-4 shrink-0 rounded border-border accent-primary focus:ring-primary focus:ring-offset-background"
                />
                <span
                  className={clsx(
                    "txt-compact-small-plus min-w-0 flex-1 truncate",
                    isSelected
                      ? "text-ui-fg-base font-medium"
                      : "text-ui-fg-muted"
                  )}
                >
                  {facet.value}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-ui-fg-muted">
                  {facet.count}
                </span>
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OptionFilter

"use client"

import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import {
  useCachedFetch,
  type FacetPayload,
} from "@lib/hooks/use-cached-fetch"

type SpecFacet = { axis: string; value: string; count: number }

type SpecFilterProps = {
  selectedSpecs?: string[]
  onSelectionChange: (specs: string[]) => void
  categoryIds?: string[]
}

const prettyAxis = (axis: string) => axis.replace(/^spec_/, "")

const SpecFilter = ({
  selectedSpecs = [],
  onSelectionChange,
  categoryIds = [],
}: SpecFilterProps) => {
  const [facets, setFacets] = useState<SpecFacet[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const params = new URLSearchParams()
  categoryIds.forEach((id) => params.append("category_id", id))
  const query = params.toString()
  const data = useCachedFetch<FacetPayload>(
    mounted ? `/api/facets${query ? `?${query}` : ""}` : null
  )

  useEffect(() => {
    if (data) {
      setFacets(Array.isArray(data.specs) ? data.specs : [])
    }
  }, [data])

  const grouped = useMemo(() => {
    const groups = new Map<string, SpecFacet[]>()
    for (const facet of facets) {
      const list = groups.get(facet.axis) ?? []
      list.push(facet)
      groups.set(facet.axis, list)
    }
    return [...groups.entries()]
  }, [facets])

  if (!mounted || !grouped.length) {
    return null
  }

  const toggleSpec = (pair: string) => {
    const next = selectedSpecs.includes(pair)
      ? selectedSpecs.filter((s) => s !== pair)
      : [...selectedSpecs, pair]
    onSelectionChange(Array.from(new Set(next)))
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="txt-compact-small-plus text-ui-fg-subtle">
          Specifications
        </span>
      </div>
      <div className="flex max-h-72 flex-col gap-y-3 overflow-y-auto pr-1">
        {grouped.map(([axis, values]) => (
          <div key={axis}>
            <p className="px-1 pb-1 font-mono text-[11px] uppercase tracking-[0.15em] text-ui-fg-muted">
              {prettyAxis(axis)}
            </p>
            {values.map((facet) => {
              const pair = `${facet.axis}:${facet.value}`
              const isSelected = selectedSpecs.includes(pair)
              return (
                <div
                  key={pair}
                  className="flex items-center gap-2.5 py-1.5"
                >
                  <div className="h-5 w-5 shrink-0" />
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSpec(pair)}
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
        ))}
      </div>
    </div>
  )
}

export default SpecFilter

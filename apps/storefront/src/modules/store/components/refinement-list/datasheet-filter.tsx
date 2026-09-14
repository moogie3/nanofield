"use client"

import { useEffect, useState } from "react"
import clsx from "clsx"

type DatasheetFilterProps = {
  checked?: boolean
  onCheckedChange: (checked: boolean) => void
  categoryIds?: string[]
}

const DatasheetFilter = ({
  checked = false,
  onCheckedChange,
  categoryIds = [],
}: DatasheetFilterProps) => {
  const [count, setCount] = useState<number | null>(null)
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
          setCount(
            typeof data.datasheetCount === "number" ? data.datasheetCount : null
          )
        }
      } catch (error) {
        console.error("Failed to fetch datasheet facet", error)
      }
    }

    fetchFacets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey])

  if (!mounted) {
    return null
  }
  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="txt-compact-small-plus text-ui-fg-subtle">
          Documentation
        </span>
      </div>
      <div className="flex items-center gap-2.5 py-1.5">
        <div className="h-5 w-5 shrink-0" />
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            className="h-4 w-4 shrink-0 rounded border-border accent-primary focus:ring-primary focus:ring-offset-background"
          />
          <span
            className={clsx(
              "txt-compact-small-plus min-w-0 flex-1 truncate",
              checked ? "text-ui-fg-base font-medium" : "text-ui-fg-muted"
            )}
          >
            Has datasheet
          </span>
          {typeof count === "number" && (
            <span className="shrink-0 font-mono text-[11px] text-ui-fg-muted">
              {count}
            </span>
          )}
        </label>
      </div>
    </div>
  )
}

export default DatasheetFilter

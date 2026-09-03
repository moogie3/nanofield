"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { GridViewIcon, ListViewIcon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

export type ViewMode = "grid" | "list"

export default function ViewToggle({
  view,
  setQueryParams,
}: {
  view: ViewMode
  setQueryParams: (name: string, value: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="txt-compact-small-plus text-ui-fg-subtle">View</span>
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-muted p-1">
        <button
          type="button"
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          onClick={() => setQueryParams("view", "grid")}
          className={cn(
            "flex items-center justify-center rounded-xl p-2 transition-colors",
            view === "grid"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <HugeiconsIcon
            icon={GridViewIcon}
            strokeWidth={2}
            className="h-4 w-4"
          />
        </button>
        <button
          type="button"
          aria-label="List view"
          aria-pressed={view === "list"}
          onClick={() => setQueryParams("view", "list")}
          className={cn(
            "flex items-center justify-center rounded-xl p-2 transition-colors",
            view === "list"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <HugeiconsIcon
            icon={ListViewIcon}
            strokeWidth={2}
            className="h-4 w-4"
          />
        </button>
      </div>
    </div>
  )
}

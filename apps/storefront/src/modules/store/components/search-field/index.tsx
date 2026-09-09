"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

// Catalog search box. Submits to /store?q= — ranking happens server-side
// (Postgres full-text + trigram via /store/search), the grid renders ids in
// rank order. Used on the hero (large) and the catalog header (compact).
const SearchField = ({
  variant = "compact",
  initialValue = "",
}: {
  variant?: "hero" | "compact"
  initialValue?: string
}) => {
  const [value, setValue] = useState(initialValue)
  const router = useRouter()
  const { countryCode } = useParams()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    router.push(
      q
        ? `/${countryCode}/store?q=${encodeURIComponent(q)}`
        : `/${countryCode}/store`
    )
  }

  const hero = variant === "hero"

  return (
    <form
      onSubmit={submit}
      role="search"
      className={
        hero ? "w-full max-w-xl" : "w-full flex-1"
      }
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <svg
              width={hero ? 20 : 16}
              height={hero ? 20 : 16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={hero ? "Search part number, IC, transistor…" : "Search part number"}
            aria-label="Search products"
            className={
              hero
                ? "h-12 w-full rounded-full border border-border bg-card/90 pl-11 pr-4 text-base text-foreground shadow-lg backdrop-blur placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                : "h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            }
          />
        </div>
        <button
          type="submit"
          className={
            hero
              ? "h-12 shrink-0 rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:opacity-90"
              : "h-10 shrink-0 rounded-full bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:opacity-90"
          }
        >
          Search
        </button>
      </div>
    </form>
  )
}

export default SearchField

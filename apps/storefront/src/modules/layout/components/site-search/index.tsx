"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CreditCardIcon,
  FaceIdIcon,
  House02Icon,
  Location01Icon,
  Package02Icon,
  ShoppingBag01Icon,
  Store02Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons"

type SuggestItem = { id: string; handle: string; title: string }

const PAGES = [
  { label: "Home", href: "/", icon: House02Icon },
  { label: "Product catalog", href: "/store", icon: Store02Icon },
  { label: "Cart", href: "/cart", icon: ShoppingBag01Icon },
  { label: "Checkout", href: "/checkout", icon: CreditCardIcon },
  { label: "Account", href: "/account", icon: UserCircleIcon },
  { label: "Orders", href: "/account/orders", icon: Package02Icon },
  { label: "Addresses", href: "/account/addresses", icon: Location01Icon },
  { label: "Profile", href: "/account/profile", icon: FaceIdIcon },
]

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

// Site-wide search in a shadcn Dialog: products (ranked, live) + storefront
// pages. The Dialog portals to <body>, locks background scroll, and keeps a
// persistent dark overlay — so the backdrop stays dark no matter how far the
// page behind has scrolled. Product suggestions carry title/handle only;
// full hydration happens on the product and catalog pages.
const SiteSearch = () => {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [items, setItems] = useState<SuggestItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { countryCode } = useParams()

  useEffect(() => {
    const q = value.trim()
    if (!open || q.length < 2) {
      setItems([])
      setTotal(0)
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(
          `${BACKEND_URL}/store/search?q=${encodeURIComponent(q)}&limit=7`,
          {
            headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
          }
        )
        const data = (await r.json()) as {
          items?: SuggestItem[]
          total?: number
        }
        setItems(Array.isArray(data.items) ? data.items : [])
        setTotal(typeof data.total === "number" ? data.total : 0)
      } catch {
        setItems([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [value, open])

  const goCatalog = (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = value.trim()
    setOpen(false)
    router.push(
      q
        ? `/${countryCode}/store?q=${encodeURIComponent(q)}`
        : `/${countryCode}/store`
    )
  }

  const q = value.trim().toLowerCase()
  const pageHits =
    q.length >= 2
      ? PAGES.filter((p) => p.label.toLowerCase().includes(q))
      : PAGES
  const showResults = value.trim().length >= 2

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        data-testid="nav-search-button"
        className="hover:text-ui-fg-base flex items-center rounded-md p-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 hover:bg-muted active:scale-95"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
      <DialogOverlay className="bg-black/60" />
      <DialogContent
        aria-label="Site search"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          inputRef.current?.focus()
        }}
        className="top-[4.5rem] max-w-lg translate-y-0 gap-0 bg-card p-3 data-[state=open]:slide-in-from-top-4"
      >
        <form onSubmit={goCatalog} role="search">
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search products, orders, cart…"
            aria-label="Site search"
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </form>
        <div className="no-scrollbar max-h-[40vh] overflow-y-auto px-1 pb-1 pt-2">
          {showResults && (
            <p className="px-2 pb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {loading
                ? "Searching…"
                : total > 0
                  ? `${total} product${total === 1 ? "" : "s"}`
                  : "No products found"}
            </p>
          )}
          {showResults &&
            items.slice(0, 6).map((item) => (
              <LocalizedClientLink
                key={item.id}
                href={`/products/${item.handle}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-muted"
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {item.title}
                </span>
                <span className="shrink-0 font-mono text-[11px] uppercase text-muted-foreground">
                  {item.handle}
                </span>
              </LocalizedClientLink>
            ))}
          {pageHits.length > 0 && (
            <>
              <p className="px-2 pb-2 pt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Pages
              </p>
              {pageHits.map((p) => (
                <LocalizedClientLink
                  key={p.href}
                  href={p.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <HugeiconsIcon
                    icon={p.icon}
                    strokeWidth={1.8}
                    className="h-4 w-4 shrink-0"
                  />
                  {p.label}
                </LocalizedClientLink>
              ))}
            </>
          )}
          {showResults && total > 0 && (
            <button
              onClick={() => goCatalog()}
              className="mt-2 w-full rounded-xl bg-primary py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
            >
              See all {total} results
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SiteSearch

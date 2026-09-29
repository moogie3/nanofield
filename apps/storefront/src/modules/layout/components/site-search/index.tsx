"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SignInGateModal from "@modules/account/components/sign-in-gate-modal"
import { retrieveCustomer } from "@lib/data/customer"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CreditCardIcon,
  CustomerService01Icon,
  FaceIdIcon,
  HelpCircleIcon,
  House02Icon,
  Location01Icon,
  Notification01Icon,
  Package02Icon,
  ReturnRequestIcon,
  ShoppingBag01Icon,
  Store02Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons"

type SuggestItem = { id: string; handle: string; title: string }

const PAGES = [
  { key: "home", href: "/", icon: House02Icon },
  { key: "store", href: "/store", icon: Store02Icon },
  { key: "cart", href: "/cart", icon: ShoppingBag01Icon },
  { key: "checkout", href: "/checkout", icon: CreditCardIcon },
  { key: "account", href: "/account", icon: UserCircleIcon },
  { key: "orders", href: "/account/orders", icon: Package02Icon },
  {
    key: "notifications",
    href: "/account/notifications",
    icon: Notification01Icon,
  },
  { key: "addresses", href: "/account/addresses", icon: Location01Icon },
  { key: "profile", href: "/account/profile", icon: FaceIdIcon },
  { key: "faq", href: "/faq", icon: HelpCircleIcon },
  { key: "contact", href: "/contact", icon: CustomerService01Icon },
  {
    key: "returns",
    href: "/returns",
    icon: ReturnRequestIcon,
  },
] as const

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

// Member-only destinations render with a lock badge for guests (visible
// teaser, same as Instagram's locked rows) — tapping one opens the
// sign-in gate modal instead of navigating to a dead-end page.
const GATED_HREFS = new Set([
  "/account/orders",
  "/account/notifications",
  "/account/addresses",
  "/account/profile",
  "/checkout",
])

const LockBadge = ({ label }: { label: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label={label}
    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

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
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [gateOpen, setGateOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { locale, countryCode } = useParams()
  const t = useTranslations("search")
  const tc = useTranslations("common")

  // Membership check per open (cheap, cached by the data layer): drives
  // the lock badges + gate modal below. Unknown (null) fails open so the
  // dialog never restricts anyone during load.
  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    retrieveCustomer()
      .then((customer) => {
        if (!cancelled) {
          setLoggedIn(!!customer)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoggedIn(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open])

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
        ? `/${locale}/${countryCode}/store?q=${encodeURIComponent(q)}`
        : `/${locale}/${countryCode}/store`
    )
  }

  // Translated page shortcuts — filtering matches the visible labels.
  const labeledPages = useMemo(
    () =>
      PAGES.map((p) => ({
        ...p,
        label: t(`pagesList.${p.key}`),
      })),
    [t]
  )
  const q = value.trim().toLowerCase()
  const pageHits =
    q.length >= 2
      ? labeledPages.filter((p) => p.label.toLowerCase().includes(q))
      : labeledPages
  const showResults = value.trim().length >= 2

  const isLocked = (href: string) => loggedIn === false && GATED_HREFS.has(href)

  // Guests tapping a locked shortcut get the gate modal (and the search
  // dialog closes beneath it) instead of a dead-end page.
  const handlePageClick = (e: React.MouseEvent, href: string) => {
    if (isLocked(href)) {
      e.preventDefault()
      setOpen(false)
      setGateOpen(true)
    } else {
      setOpen(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("label")}
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
        aria-label={t("dialogLabel")}
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
            placeholder={tc("searchPlaceholder")}
            aria-label={t("dialogLabel")}
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </form>
        <div className="no-scrollbar max-h-[40vh] overflow-y-auto px-1 pb-1 pt-2">
          {showResults && (
            <p className="px-2 pb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {loading
                ? t("searching")
                : total > 0
                  ? t("productsFound", { count: total })
                  : t("noProducts")}
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
                {t("pages")}
              </p>
              {pageHits.map((p) => (
                <LocalizedClientLink
                  key={p.href}
                  href={p.href}
                  onClick={(e) => handlePageClick(e, p.href)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <HugeiconsIcon
                    icon={p.icon}
                    strokeWidth={1.8}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="flex-1">{p.label}</span>
                  {isLocked(p.href) && <LockBadge label={t("membersOnly")} />}
                </LocalizedClientLink>
              ))}
            </>
          )}
          {showResults && total > 0 && (
            <button
              onClick={() => goCatalog()}
              className="mt-2 w-full rounded-xl bg-primary py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
            >
              {t("seeAll", { count: total })}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
      <SignInGateModal open={gateOpen} onClose={() => setGateOpen(false)} />
    </>
  )
}

export default SiteSearch

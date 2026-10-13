import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { retrieveCustomer } from "@lib/data/customer"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import { getTranslations } from "next-intl/server"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { NanofieldMark } from "@modules/common/components/nanofield-logo"
import CartButton from "@modules/layout/components/cart-button"
import LocaleToggle from "@modules/layout/components/locale-toggle"
import NotificationButton from "@modules/layout/components/notification-button"
import SideMenu from "@modules/layout/components/side-menu"
import SiteSearch from "@modules/layout/components/site-search"
import StickyNav from "@modules/layout/components/sticky-nav"
import AnnouncementBanner from "@modules/layout/components/announcement-banner"
import {
  AccountNavIcon,
  CartNavIcon,
} from "@modules/layout/components/nav-icons"
import { ThemeToggle } from "../../../../components/theme-toggle"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])
  // Login gate for the mobile side-menu entry (the desktop bell gates
  // itself). Never throws — guests simply get no entry.
  const customer = await retrieveCustomer().catch(() => null)
  const t = await getTranslations("nav")

  return (
    <StickyNav banner={<AnnouncementBanner />}>
      <nav className="content-container text-ui-fg-subtle flex items-center justify-between w-full h-full text-base">
        <div className="flex-1 basis-0 h-full flex items-center gap-x-6">
          <div className="h-full">
            <SideMenu
              regions={regions}
              locales={locales}
              currentLocale={currentLocale}
              isLoggedIn={!!customer}
            />
          </div>
          <div className="flex items-center h-full">
            <SiteSearch />
          </div>
        </div>

        <div className="flex items-center h-full">
          <LocalizedClientLink
            href="/"
            className="nav-wordmark group hover:text-ui-fg-base font-brand text-2xl font-semibold text-foreground"
            data-testid="nav-store-link"
          >
            <span className="flex items-center">
              <NanofieldMark className="h-8 w-auto opacity-40 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" />
              {/* Wordmark unfurls from the mark on hover/focus: the 0fr->1fr
                  grid track animates to the exact text width while the
                  nav-wordmark letter-spacing + sheen fire the whoosh. Text
                  stays mounted (opacity only) so readers/SEO still see it. */}
              <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-500 ease-out group-focus-visible:grid-cols-[1fr] group-hover:grid-cols-[1fr] motion-reduce:transition-none">
                <span className="overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-300 group-focus-visible:opacity-100 group-hover:opacity-100 group-hover:delay-150 motion-reduce:transition-none">
                  <span className="ml-2 inline-block">Nanofield</span>
                </span>
              </span>
            </span>
          </LocalizedClientLink>
        </div>

        <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
          <div className="hidden small:flex items-center gap-x-6 h-full">
            <LocalizedClientLink
              className="hover:text-ui-fg-base flex items-center rounded-md p-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 hover:bg-muted active:scale-95"
              href="/account"
              aria-label={t("account")}
              data-testid="nav-account-link"
            >
              <AccountNavIcon />
            </LocalizedClientLink>
          </div>
          <Suspense
            fallback={
              <LocalizedClientLink
                className="hover:text-ui-fg-base flex items-center rounded-md p-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 hover:bg-muted active:scale-95"
                href="/cart"
                aria-label={t("cart")}
                data-testid="nav-cart-link"
              >
                <CartNavIcon />
              </LocalizedClientLink>
            }
          >
            <CartButton />
          </Suspense>
          {/* Login-gated bell: renders nothing for guests. Desktop only
              (mobile uses the side-menu entry), left of the theme toggle.
              Uniform gap-x-6 rhythm with every other nav icon. */}
          <div className="hidden small:flex items-center h-full">
            <Suspense fallback={null}>
              <NotificationButton />
            </Suspense>
          </div>
          <div className="hidden small:flex items-center">
            <LocaleToggle />
          </div>
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </StickyNav>
  )
}

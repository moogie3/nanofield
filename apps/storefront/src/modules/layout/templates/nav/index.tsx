import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import StickyNav from "@modules/layout/components/sticky-nav"
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

  return (
    <StickyNav>
      <nav className="content-container text-ui-fg-subtle flex items-center justify-between w-full h-full text-base">
        <div className="flex-1 basis-0 h-full flex items-center">
          <div className="h-full">
            <SideMenu
              regions={regions}
              locales={locales}
              currentLocale={currentLocale}
            />
          </div>
        </div>

        <div className="flex items-center h-full">
          <LocalizedClientLink
            href="/"
            className="nav-wordmark hover:text-ui-fg-base uppercase font-heading font-bold text-primary text-2xl"
            data-testid="nav-store-link"
          >
            Nanofield
          </LocalizedClientLink>
        </div>

        <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
          <div className="hidden small:flex items-center gap-x-6 h-full">
            <LocalizedClientLink
              className="hover:text-ui-fg-base flex items-center rounded-md p-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 hover:bg-muted active:scale-95"
              href="/account"
              aria-label="Account"
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
                aria-label="Cart"
                data-testid="nav-cart-link"
              >
                <CartNavIcon />
              </LocalizedClientLink>
            }
          >
            <CartButton />
          </Suspense>
          <div className="flex items-center ml-4">
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </StickyNav>
  )
}

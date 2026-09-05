"use client"

import { clx } from "@modules/common/components/ui"
import { useParams, usePathname } from "next/navigation"

import { signout } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  FaceIdIcon,
  Location01Icon,
  Logout01Icon,
  PackageIcon,
} from "@hugeicons/core-free-icons"

const AccountNav = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }

  const handleLogout = async () => {
    await signout(countryCode)
  }

  return (
    <div>
      <div className="small:hidden" data-testid="mobile-account-nav">
        {route !== `/${countryCode}/account` ? (
          <LocalizedClientLink
            href="/account"
            className="flex items-center gap-x-2 text-small-regular py-2"
            data-testid="account-main-link"
          >
            <>
              <ChevronDown className="transform rotate-90" />
              <span>Account</span>
            </>
          </LocalizedClientLink>
        ) : (
          <>
            <div className="text-xl-semi mb-4 px-8">
              Hello {customer?.first_name}
            </div>
            <div className="text-base-regular">
              <ul>
                <li>
                  <LocalizedClientLink
                    href="/account/profile"
                    className="flex items-center justify-between py-4 border-b border-border px-8"
                    data-testid="profile-link"
                  >
                    <>
                      <div className="flex items-center gap-x-2">
                        <HugeiconsIcon
                          icon={FaceIdIcon}
                          strokeWidth={2}
                          className="h-5 w-5"
                        />
                        <span>Profile</span>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/addresses"
                    className="flex items-center justify-between py-4 border-b border-border px-8"
                    data-testid="addresses-link"
                  >
                    <>
                      <div className="flex items-center gap-x-2">
                        <HugeiconsIcon
                          icon={Location01Icon}
                          strokeWidth={2}
                          className="h-5 w-5"
                        />
                        <span>Addresses</span>
                      </div>
                      <ChevronDown className="transform -rotate-90" />
                    </>
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account/orders"
                    className="flex items-center justify-between py-4 border-b border-border px-8"
                    data-testid="orders-link"
                  >
                    <div className="flex items-center gap-x-2">
                      <HugeiconsIcon
                        icon={PackageIcon}
                        strokeWidth={2}
                        className="h-5 w-5"
                      />
                      <span>Orders</span>
                    </div>
                    <ChevronDown className="transform -rotate-90" />
                  </LocalizedClientLink>
                </li>
                <li>
                  <button
                    type="button"
                    className="flex items-center justify-between py-4 border-b border-border px-8 w-full"
                    onClick={handleLogout}
                    data-testid="logout-button"
                  >
                    <div className="flex items-center gap-x-2">
                      <HugeiconsIcon
                        icon={Logout01Icon}
                        strokeWidth={2}
                        className="h-5 w-5"
                      />
                      <span>Log out</span>
                    </div>
                    <ChevronDown className="transform -rotate-90" />
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
      <div className="hidden small:block" data-testid="account-nav">
        <div>
          <div className="pb-4">
            <h3 className="text-xl-semi">Account</h3>
          </div>
          <div className="text-base-regular">
            <ul className="flex mb-0 justify-start items-start flex-col gap-y-4">
              <li>
                <AccountNavLink
                  href="/account"
                  route={route!}
                  data-testid="overview-link"
                  icon={DashboardSquare01Icon}
                >
                  Overview
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/profile"
                  route={route!}
                  data-testid="profile-link"
                  icon={FaceIdIcon}
                >
                  Profile
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/addresses"
                  route={route!}
                  data-testid="addresses-link"
                  icon={Location01Icon}
                >
                  Addresses
                </AccountNavLink>
              </li>
              <li>
                <AccountNavLink
                  href="/account/orders"
                  route={route!}
                  data-testid="orders-link"
                  icon={PackageIcon}
                >
                  Orders
                </AccountNavLink>
              </li>
              <li className="text-grey-700">
                <button
                  type="button"
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className="flex items-center gap-x-2 rounded-lg px-3 py-1.5 -ml-3 text-ui-fg-subtle transition-colors hover:bg-muted hover:text-ui-fg-base"
                >
                  <HugeiconsIcon
                    icon={Logout01Icon}
                    strokeWidth={2}
                    className="h-5 w-5"
                  />
                  <span>Log out</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

type AccountNavLinkProps = {
  href: string
  route: string
  children: React.ReactNode
  icon: IconSvgElement
  "data-testid"?: string
}

const AccountNavLink = ({
  href,
  route,
  children,
  icon,
  "data-testid": dataTestId,
}: AccountNavLinkProps) => {
  const { countryCode }: { countryCode: string } = useParams()

  const active = route.split(countryCode)[1] === href
  return (
    <LocalizedClientLink
      href={href}
      className={clx(
        "flex items-center gap-x-2 rounded-lg px-3 py-1.5 -ml-3 text-ui-fg-subtle transition-colors hover:bg-muted hover:text-ui-fg-base",
        {
          "bg-muted text-ui-fg-base font-semibold": active,
        }
      )}
      data-testid={dataTestId}
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="h-5 w-5" />
      <span>{children}</span>
    </LocalizedClientLink>
  )
}

export default AccountNav

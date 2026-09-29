import { getLocale, getTranslations } from "next-intl/server"
import { Container, Heading, Text } from "@modules/common/components/ui"

import ChevronDown from "@modules/common/icons/chevron-down"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { SectionIcon } from "@modules/layout/components/nav-icons"
import {
  FaceIdIcon,
  Location01Icon,
  PackageIcon,
} from "@hugeicons/core-free-icons"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = async ({ customer, orders }: OverviewProps) => {
  const t = await getTranslations("account.overview")
  const localeTag = (await getLocale()) === "id" ? "id-ID" : "en-US"
  return (
    <div data-testid="overview-page-wrapper">
      <div className="hidden small:block">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-subtle">
          {t("eyebrow")}
        </span>
        <Heading
          level="h2"
          className="flex justify-between items-center mb-4 text-3xl-regular"
        >
            <span data-testid="welcome-message" data-value={customer?.first_name}>
              {t("hello", { name: customer?.first_name ?? "" })}
            </span>
            <span className="text-small-regular font-normal text-ui-fg-base">
              {t("signedInAs")}{" "}
            <span
              className="font-semibold"
              data-testid="customer-email"
              data-value={customer?.email}
            >
              {customer?.email}
            </span>
          </span>
        </Heading>
        <Text className="text-base-regular mb-4 text-ui-fg-subtle">
          {t("intro")}
        </Text>
        <div className="flex flex-col py-8 border-t border-border">
          <div className="flex flex-col gap-y-4 h-full col-span-1 row-span-2 flex-1">
            <div className="flex items-start gap-x-16 mb-6">
              <div className="flex flex-col gap-y-4">
                <h3 className="text-large-semi flex items-center gap-2">
                  <SectionIcon icon={FaceIdIcon} />
                  {t("profile")}
                </h3>
                <div className="flex items-end gap-x-2">
                  <span
                    className="text-3xl-semi leading-none"
                    data-testid="customer-profile-completion"
                    data-value={getProfileCompletion(customer)}
                  >
                    {getProfileCompletion(customer)}%
                  </span>
                  <span className="uppercase text-base-regular text-ui-fg-subtle">
                    {t("completed")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-y-4">
                <h3 className="text-large-semi flex items-center gap-2">
                  <SectionIcon icon={Location01Icon} />
                  {t("addresses")}
                </h3>
                <div className="flex items-end gap-x-2">
                  <span
                    className="text-3xl-semi leading-none"
                    data-testid="addresses-count"
                    data-value={customer?.addresses?.length || 0}
                  >
                    {customer?.addresses?.length || 0}
                  </span>
                  <span className="uppercase text-base-regular text-ui-fg-subtle">
                    {t("saved")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-y-4">
              <div className="flex items-center gap-x-2">
                <h3 className="text-large-semi flex items-center gap-2">
                  <SectionIcon icon={PackageIcon} />
                  {t("recentOrders")}
                </h3>
              </div>
              <ul
                className="flex flex-col gap-y-4"
                data-testid="orders-wrapper"
              >
                {orders && orders.length > 0 ? (
                  orders.slice(0, 5).map((order) => {
                    return (
                      <li
                        key={order.id}
                        data-testid="order-wrapper"
                        data-value={order.id}
                      >
                        <LocalizedClientLink
                          href={`/account/orders/details/${order.id}`}
                        >
                          <Container className="bg-muted flex justify-between items-center p-4">
                            <div className="grid grid-cols-3 grid-rows-2 text-small-regular gap-x-4 flex-1">
                              <span className="font-semibold">
                                {t("datePlaced")}
                              </span>
                              <span className="font-semibold">
                                {t("orderNumber")}
                              </span>
                              <span className="font-semibold">
                                {t("totalAmount")}
                              </span>
                              <span data-testid="order-created-date">
                                {new Date(order.created_at).toLocaleDateString(
                                  localeTag
                                )}
                              </span>
                              <span
                                data-testid="order-id"
                                data-value={order.display_id}
                              >
                                #{order.display_id}
                              </span>
                              <span data-testid="order-amount">
                                {convertToLocale({
                                  amount: order.total,
                                  currency_code: order.currency_code,
                                })}
                              </span>
                            </div>
                            <button
                              className="flex items-center justify-between"
                              data-testid="open-order-button"
                            >
                              <span className="sr-only">
                                {t("goToOrder", { id: order.display_id })}
                              </span>
                              <ChevronDown className="-rotate-90" />
                            </button>
                          </Container>
                        </LocalizedClientLink>
                      </li>
                    )
                  })
                ) : (
                  <span data-testid="no-orders-message">
                    {t("noOrders")}
                  </span>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0

  if (!customer) {
    return 0
  }

  if (customer.email) {
    count++
  }

  if (customer.first_name && customer.last_name) {
    count++
  }

  if (customer.phone) {
    count++
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing,
  )

  if (billingAddress) {
    count++
  }

  return (count / 4) * 100
}

export default Overview

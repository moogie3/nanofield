import { getLocale, getTranslations } from "next-intl/server"
import { Container, Heading, Text } from "@modules/common/components/ui"

import { isStripeLike, paymentInfoMap } from "@lib/constants"
import { getPaymentTitle } from "@modules/checkout/components/payment-title"
import Divider from "@modules/common/components/divider"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = async ({ order }: PaymentDetailsProps) => {
  const t = await getTranslations("order")
  const tp = await getTranslations("checkout.payment")
  const localeTag = (await getLocale()) === "id" ? "id-ID" : "en-US"
  const payment = order.payment_collections?.[0].payments?.[0]
  const info = payment ? paymentInfoMap[payment.provider_id] : undefined
  const capturedAt = (payment as { captured_at?: string } | undefined)
    ?.captured_at

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        {t("payment")}
      </Heading>
      <div>
        {payment && (
          <div className="flex items-start gap-x-1 w-full">
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("paymentMethod")}
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method"
              >
                {getPaymentTitle(
                  payment.provider_id,
                  (k) => tp(`providers.${k}`),
                  info?.title
                )}
              </Text>
            </div>
            <div className="flex flex-col w-2/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t("paymentDetails")}
              </Text>
              <div className="flex gap-2 txt-medium text-ui-fg-subtle items-start">
                {info?.icon && (
                  <Container className="flex items-center h-6 w-fit px-2 bg-ui-button-neutral-hover">
                    {info.icon}
                  </Container>
                )}
                <Text data-testid="payment-amount">
                  {isStripeLike(payment.provider_id) && payment.data?.card_last4
                    ? `**** **** **** ${payment.data.card_last4}`
                    : capturedAt
                      ? t("paidAt", {
                          amount: convertToLocale({
                            amount: payment.amount,
                            currency_code: order.currency_code,
                          }),
                          date: new Date(capturedAt).toLocaleString(localeTag),
                        })
                      : t("awaiting", {
                          amount: convertToLocale({
                            amount: payment.amount,
                            currency_code: order.currency_code,
                          }),
                        })}
                </Text>
              </div>
            </div>
          </div>
        )}
      </div>

      <Divider className="mt-8" />
    </div>
  )
}

export default PaymentDetails

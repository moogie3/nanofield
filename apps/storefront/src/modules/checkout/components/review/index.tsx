"use client"

import { useTranslations } from "next-intl"
import { Heading, Text, clx } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import PaymentButton from "../payment-button"
import { useSearchParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

const Review = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const searchParams = useSearchParams()
  const t = useTranslations("checkout.review")

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards &&
    ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])

      ?.length > 0 &&
    cart?.total === 0
  )

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none": !isOpen,
            },
          )}
        >
          {t("title")}
        </Heading>
      </div>
      {isOpen && previousStepsCompleted && (
        <>
          <div className="flex items-start gap-x-1 w-full mb-6">
            <div className="w-full">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                {t.rich("terms", {
                  termsOfUse: (chunks) => (
                    <LocalizedClientLink
                      href="/pages/terms-of-use"
                      className="underline"
                    >
                      {chunks}
                    </LocalizedClientLink>
                  ),
                  termsOfSale: (chunks) => (
                    <LocalizedClientLink
                      href="/pages/terms-of-sale"
                      className="underline"
                    >
                      {chunks}
                    </LocalizedClientLink>
                  ),
                  returnsPolicy: (chunks) => (
                    <LocalizedClientLink
                      href="/returns"
                      className="underline"
                    >
                      {chunks}
                    </LocalizedClientLink>
                  ),
                  privacyPolicy: (chunks) => (
                    <LocalizedClientLink
                      href="/pages/privacy-policy"
                      className="underline"
                    >
                      {chunks}
                    </LocalizedClientLink>
                  ),
                })}
              </Text>
            </div>
          </div>
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </>
      )}
    </div>
  )
}

export default Review
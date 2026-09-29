"use client"

import { placeOrder } from "@lib/data/cart"
import { useTranslations } from "next-intl"
import ErrorMessage from "@modules/checkout/components/error-message"
import { Button, Heading } from "@modules/common/components/ui"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

const SETTLED = new Set(["capture", "settlement"])

// Shown after Snap redirects back. Settlement first, order second: the cart
// is completed here (which authorizes against the now-settled transaction),
// then placeOrder routes to the order confirmation.
const MidtransReturn = ({
  midtransOrderId,
  transactionStatus,
}: {
  midtransOrderId?: string
  transactionStatus?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const { locale, countryCode } = useParams()
  const t = useTranslations("order.midtrans")

  const settled = !!transactionStatus && SETTLED.has(transactionStatus)

  const handleComplete = async () => {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await placeOrder()
    } catch (err) {
      setErrorMessage((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="py-12 min-h-[calc(100vh-64px)]">
      <div className="content-container flex flex-col items-center gap-y-6 max-w-2xl">
        <div className="flex flex-col gap-4 w-full bg-card border border-border rounded-2xl p-10">
          <Heading level="h1" className="text-3xl">
            {settled ? t("received") : t("status")}
          </Heading>
          <p className="txt-medium text-ui-fg-subtle">
            {settled ? (
              <>
                {t("settledBody", {
                  id: midtransOrderId ?? "",
                  status: transactionStatus ?? "",
                })}
              </>
            ) : transactionStatus === "pending" ? (
              <>
                {t("pendingBody", {
                  txn: midtransOrderId
                    ? t("pendingTxn", { id: midtransOrderId })
                    : "",
                })}
              </>
            ) : (
              <>
                {t("failedBody", {
                  status: transactionStatus
                    ? t("failedStatus", { status: transactionStatus })
                    : "",
                })}
              </>
            )}
          </p>
          {settled ? (
            <>
              <Button
                onClick={handleComplete}
                isLoading={submitting}
                size="large"
                data-testid="midtrans-complete-order-button"
              >
                {t("complete")}
              </Button>
              <ErrorMessage
                error={errorMessage}
                data-testid="midtrans-complete-error-message"
              />
            </>
          ) : (
            <div className="flex gap-x-4">
              <Button
                size="large"
                onClick={() => router.push(`/${locale}/${countryCode}/cart`)}
              >
                {t("backToCart")}
              </Button>
              <Button
                size="large"
                variant="secondary"
                onClick={() =>
                  router.push(`/${locale}/${countryCode}/account/orders`)
                }
              >
                {t("myOrders")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MidtransReturn

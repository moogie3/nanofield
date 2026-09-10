"use client"

import { placeOrder } from "@lib/data/cart"
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
  const { countryCode } = useParams()

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
            {settled ? "Payment received" : "Payment status"}
          </Heading>
          <p className="txt-medium text-ui-fg-subtle">
            {settled ? (
              <>
                Midtrans confirms transaction{" "}
                <span className="font-mono">{midtransOrderId}</span> as{" "}
                {transactionStatus}. Complete your order below — your items
                are still reserved in your cart.
              </>
            ) : transactionStatus === "pending" ? (
              <>
                Your payment is still pending
                {midtransOrderId && (
                  <>
                    {" "}
                    (transaction{" "}
                    <span className="font-mono">{midtransOrderId}</span>)
                  </>
                )}
                . Finish it in your e-wallet or bank app then complete the
                order — unpaid carts expire automatically.
              </>
            ) : (
              <>
                This payment did not complete
                {transactionStatus && <> (status: {transactionStatus})</>}.
                No order was placed and no money moved — pick another method
                or retry.
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
                Complete my order
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
                onClick={() => router.push(`/${countryCode}/cart`)}
              >
                Back to cart
              </Button>
              <Button
                size="large"
                variant="secondary"
                onClick={() => router.push(`/${countryCode}/account/orders`)}
              >
                My orders
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MidtransReturn

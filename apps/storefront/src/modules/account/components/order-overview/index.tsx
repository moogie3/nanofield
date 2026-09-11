"use client"

import { Button } from "@modules/common/components/ui"

import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

const OrderOverview = ({
  orders,
  hasMore,
  nextLimit,
}: {
  orders: HttpTypes.StoreOrder[]
  hasMore?: boolean
  nextLimit?: number
}) => {
  if (orders?.length) {
    return (
      <div className="flex flex-col gap-y-8 w-full">
        {orders.map((o) => (
          <div
            key={o.id}
            className="border-b border-border pb-6 last:pb-0 last:border-none"
          >
            <OrderCard order={o} />
          </div>
        ))}
        {hasMore && nextLimit && (
          <div className="flex justify-center pt-2">
            <LocalizedClientLink
              href={`/account/orders?limit=${nextLimit}`}
              passHref
            >
              <Button data-testid="show-more-orders-button" variant="secondary">
                Show more orders
              </Button>
            </LocalizedClientLink>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-center gap-y-4"
      data-testid="no-orders-container"
    >
      <h2 className="text-large-semi">Nothing to see here</h2>
      <p className="text-base-regular">
        You don&apos;t have any orders yet, let us change that {":)"}
      </p>
      <div className="mt-4">
        <LocalizedClientLink href="/" passHref>
          <Button data-testid="continue-shopping-button">
            Continue shopping
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderOverview

import { useMemo } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { Button } from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const chip =
  "inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-ui-fg-base"

const OrderCard = ({ order }: OrderCardProps) => {
  const numberOfLines = useMemo(() => {
    return (
      order.items?.reduce((acc, item) => {
        return acc + item.quantity
      }, 0) ?? 0
    )
  }, [order])

  const paid = useMemo(() => {
    return (order.payment_collections ?? []).some((pc) =>
      (pc.payments ?? []).some((p) => !!p.captured_at)
    )
  }, [order])

  const trackingNumber = useMemo(() => {
    // Store fulfillments expose packed/shipped/delivered timestamps (no
    // tracking labels on this endpoint). Shipped +
    // courier means the AWB is moving; packed means handed over.
    const act = (order.fulfillments ?? []).filter((f) => !f.canceled_at)
    if (act.some((f) => f.delivered_at)) {
      return "delivered" as const
    }
    if (act.some((f) => f.shipped_at)) {
      return "shipped" as const
    }
    if (act.some((f) => f.packed_at)) {
      return "packed" as const
    }
    return null
  }, [order])

  const courier = order.shipping_methods?.[0]?.name
  const address = order.shipping_address
  const canceled = order.status === "canceled"

  const paymentLabel = canceled ? "Canceled" : paid ? "Paid" : "Awaiting payment"
  const shippingLabel = canceled
    ? "Canceled"
    : trackingNumber === "delivered"
      ? "Delivered"
      : trackingNumber === "shipped"
        ? `Shipped${courier ? ` via ${courier}` : ""}`
        : trackingNumber === "packed"
          ? "Packed"
          : "Preparing"

  return (
    <div
      className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-4"
      data-testid="order-card"
    >
      <div>
        <div className="uppercase text-large-semi mb-1">
          #<span data-testid="order-display-id">{order.display_id}</span>
        </div>
        <div className="flex items-center divide-x divide-border text-small-regular text-ui-fg-base">
          <span className="pr-2" data-testid="order-created-at">
            {new Date(order.created_at).toDateString()}
          </span>
          <span className="px-2" data-testid="order-amount">
            {convertToLocale({
              amount: order.total,
              currency_code: order.currency_code,
            })}
          </span>
          <span className="pl-2">{`${numberOfLines} ${
            numberOfLines > 1 ? "items" : "item"
          }`}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className={chip} data-testid="order-payment-status">
            {paymentLabel}
          </span>
          <span className={chip} data-testid="order-fulfillment-status">
            {shippingLabel}
          </span>
          {courier && (
            <span className={chip} data-testid="order-courier">
              {courier}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-y-3">
        {order.items?.slice(0, 4).map((i) => {
          return (
            <div
              key={i.id}
              className="flex items-center gap-x-3"
              data-testid="order-item"
            >
              <div className="w-16 shrink-0">
                <Thumbnail thumbnail={i.thumbnail} images={[]} size="square" />
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="text-ui-fg-base font-semibold truncate"
                  data-testid="item-title"
                >
                  {i.title}
                </span>
                <span
                  className="text-small-regular text-ui-fg-subtle"
                  data-testid="item-quantity"
                >
                  x {i.quantity}
                </span>
              </div>
            </div>
          )
        })}
        {(order.items?.length ?? 0) > 4 && (
          <span className="text-small-regular text-ui-fg-subtle">
            + {(order.items?.length ?? 0) - 4} more products
          </span>
        )}
      </div>
      <div className="flex flex-col gap-y-1 text-small-regular text-ui-fg-base border-t border-border pt-4">
        {address && (
          <span data-testid="order-shipping-address">
            Ship to: {address.address_1}
            {address.city && `, ${address.city}`}
            {address.province && `, ${address.province}`}{" "}
            {address.postal_code}
          </span>
        )}
        <span data-testid="order-tracking">
          {trackingNumber === "delivered"
            ? "Delivered — enjoy your components."
            : trackingNumber === "shipped"
              ? `On its way${courier ? ` with ${courier}` : ""} — AWB is booked manually, ask support for the number.`
              : trackingNumber === "packed"
                ? "Packed — handing over to the courier."
                : canceled
                  ? "Order canceled — no shipment."
                  : "Tracking: seller is preparing your shipment."}
        </span>
      </div>
      <div className="flex justify-end">
        <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
          <Button data-testid="order-details-link" variant="secondary">
            See details
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderCard

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
  "inline-flex items-center rounded-full border border-border bg-ui-bg-subtle px-3 py-1 text-xs font-medium text-ui-fg-base shadow-sm"

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
      className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-4 hover:shadow-[0_4px_24px_rgba(255,255,255,0.05)] transition-shadow duration-300 relative overflow-hidden"
      data-testid="order-card"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-ui-bg-base/5 rounded-bl-full -z-10 pointer-events-none blur-3xl"></div>
      
      <div>
        <div className="text-large-semi mb-3">
          Order ID: <span className="font-mono text-sm" data-testid="order-raw-id">{order.id}</span>
        </div>
        <div className="flex items-center divide-x divide-border text-small-regular text-ui-fg-base">
          <div className="flex flex-col pr-3 gap-y-0.5">
            <span data-testid="order-created-at">
              {new Date(order.created_at).toDateString()}
            </span>
            <span className="uppercase text-ui-fg-subtle text-[10px] font-medium" data-testid="order-display-id">
              Order #{order.display_id}
            </span>
          </div>
          <span className="px-3" data-testid="order-amount">
            {convertToLocale({
              amount: order.total,
              currency_code: order.currency_code,
            })}
          </span>
          <span className="pl-3">{`${numberOfLines} ${
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
      <div className="flex justify-between items-end mt-2">
        <div className="flex flex-col gap-y-1">
          <span className="text-ui-fg-subtle text-xs font-semibold uppercase tracking-wider">Scan to Track</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://nanofield.com/order/${order.id}`)}`} 
            alt="Track Order QR" 
            className="w-16 h-16 rounded-md border border-border p-1 bg-white" 
          />
        </div>
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

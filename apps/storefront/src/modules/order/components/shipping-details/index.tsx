import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"

import Divider from "@modules/common/components/divider"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  const active = (order.fulfillments ?? []).filter((f) => !f.canceled_at)
  const shipmentState = order.status === "canceled"
    ? "canceled"
    : active.some((f) => f.delivered_at)
      ? "delivered"
      : active.some((f) => f.shipped_at)
        ? "shipped"
        : active.some((f) => f.packed_at)
          ? "packed"
          : "preparing"
  const courier = (order.shipping_methods?.[0] as { name?: string })?.name

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        Delivery
      </Heading>
      <div className="flex items-start gap-x-8">
        <div
          className="flex flex-col w-1/3"
          data-testid="shipping-address-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            Shipping Address
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.first_name}{" "}
            {order.shipping_address?.last_name}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.address_1}{" "}
            {order.shipping_address?.address_2}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.postal_code},{" "}
            {order.shipping_address?.city}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.country_code?.toUpperCase()}
          </Text>
        </div>

        <div
          className="flex flex-col w-1/3 "
          data-testid="shipping-contact-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">Contact</Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.phone}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">{order.email}</Text>
        </div>

        <div
          className="flex flex-col w-1/3"
          data-testid="shipping-method-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">Method</Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {(order.shipping_methods?.[0] as { name?: string })?.name} (
            {convertToLocale({
              amount: order.shipping_methods?.[0]?.total ?? 0,
              currency_code: order.currency_code,
            })}
            )
          </Text>
        </div>
      </div>
      <div className="mt-4" data-testid="shipment-status">
        <Text className="txt-medium-plus text-ui-fg-base mb-1">Shipment</Text>
        <Text className="txt-medium text-ui-fg-subtle">
          {shipmentState === "delivered" && "Delivered — enjoy your components."}
          {shipmentState === "shipped" &&
            `On its way${courier ? ` with ${courier}` : ""} — the AWB is booked manually, ask support for the number.`}
          {shipmentState === "packed" && "Packed — handing over to the courier."}
          {shipmentState === "preparing" &&
            "Seller is preparing your shipment."}
          {shipmentState === "canceled" && "Order canceled — no shipment."}
        </Text>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default ShippingDetails

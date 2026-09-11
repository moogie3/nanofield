"use client"

import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PageHeader from "@modules/common/components/page-header"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderSummary from "@modules/order/components/order-summary"
import PaymentDetails from "@modules/order/components/payment-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import React from "react"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate: React.FC<OrderDetailsTemplateProps> = ({
  order,
}) => {
  return (
    <div className="flex flex-col justify-center gap-y-4">
      <div className="flex gap-2 justify-between items-center">
        <PageHeader
          eyebrow="Account"
          title="Order details"
          subtitle="Track payment, shipment, and items for this order — including its QR code and transfer reference."
        />
        <LocalizedClientLink
          href="/account/orders"
          className="flex gap-2 items-center text-ui-fg-subtle hover:text-ui-fg-base shrink-0"
          data-testid="back-to-overview-button"
        >
          <XMark /> Back to overview
        </LocalizedClientLink>
      </div>
      <div
        className="flex flex-col gap-4 h-full bg-card border border-border rounded-2xl w-full p-6"
        data-testid="order-details-container"
      >
        <OrderDetails order={order} showStatus />
        <Items order={order} />
        <ShippingDetails order={order} />
        <PaymentDetails order={order} />
        <OrderSummary order={order} />
        <Help />
      </div>
    </div>
  )
}

export default OrderDetailsTemplate

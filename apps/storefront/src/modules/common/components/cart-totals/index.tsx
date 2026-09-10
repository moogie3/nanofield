"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
    shipping_methods?: { id: string }[]
  }
  // The cart page is pre-decision by definition: it always shows TBD so a
  // courier picked in an earlier session never leaks a stale amount here.
  // Everywhere else the row follows the cart (TBD until a method is chosen).
  forceTbd?: boolean
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals, forceTbd = false }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
    shipping_methods,
  } = totals

  // No courier chosen yet (cart page, early checkout steps): show TBD
  // instead of an amount, since nothing is decided. Once a delivery option
  // is picked — or on the order confirmation, which always carries
  // methods — the real amount renders.
  const showTbd =
    forceTbd ||
    (Array.isArray(shipping_methods) ? shipping_methods.length === 0 : false)

  // While shipping is TBD the total must not smuggle a stale shipping
  // amount in either: items minus discount only.
  const displayTotal =
    showTbd && item_subtotal != null
      ? item_subtotal - (discount_subtotal ?? 0)
      : total

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle ">
        <div className="flex items-center justify-between">
          <span>Subtotal (excl. shipping and taxes)</span>
          <span data-testid="cart-subtotal" data-value={item_subtotal || 0}>
            {convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Shipping</span>
          {showTbd ? (
            <span data-testid="cart-shipping" data-value={0}>
              TBD
            </span>
          ) : (
            <span data-testid="cart-shipping" data-value={shipping_subtotal || 0}>
              {convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })}
            </span>
          )}
        </div>
        {!!discount_subtotal && (
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <span
              className="text-ui-fg-interactive"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              -{" "}
              {convertToLocale({
                amount: discount_subtotal ?? 0,
                currency_code,
              })}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="flex gap-x-1 items-center ">Taxes</span>
          <span data-testid="cart-taxes" data-value={tax_total || 0}>
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
          </span>
        </div>
      </div>
      <div className="h-px w-full border-b border-border my-4" />
      <div className="flex items-center justify-between text-ui-fg-base mb-2 txt-medium pr-1">
        <span>Total</span>
        <span
          className="txt-xlarge-plus"
          data-testid="cart-total"
          data-value={displayTotal || 0}
        >
          {convertToLocale({ amount: displayTotal ?? 0, currency_code })}
        </span>
      </div>
      <div className="h-px w-full border-b border-border mt-4" />
    </div>
  )
}

export default CartTotals

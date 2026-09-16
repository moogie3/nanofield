"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import DeleteButton from "@modules/common/components/delete-button"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useCartCount } from "@modules/common/components/cart-count"
import QuantityStepper from "@modules/cart/components/quantity-stepper"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CartNavIcon } from "../nav-icons"
import Thumbnail from "@modules/products/components/thumbnail"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

const DropdownLineItem = ({
  item,
  currencyCode,
}: {
  item: NonNullable<HttpTypes.StoreCart["items"]>[number]
  currencyCode: string
}) => {
  const [error, setError] = useState<string | null>(null)

  // Same stock cap as the cart page: + grays out exactly at available
  // stock instead of failing silently on the server round-trip.
  const variantQty = item.variant?.inventory_quantity
  const stockLimited =
    !item.variant?.allow_backorder &&
    typeof variantQty === "number" &&
    variantQty > 0
  const maxQuantity = stockLimited ? variantQty : 10

  return (
    <div
      className="grid grid-cols-[64px_1fr] gap-x-3"
      key={item.id}
      data-testid="cart-item"
    >
      <LocalizedClientLink
        href={`/products/${item.product_handle}`}
        className="w-16"
      >
        <Thumbnail
          thumbnail={item.thumbnail}
          images={item.variant?.product?.images}
          size="square"
          placeholderSize="xs"
          showPlaceholderLabel={false}
          className="rounded-none border-0 p-0 shadow-none"
        />
      </LocalizedClientLink>
      <div className="flex flex-col justify-between flex-1">
        <div className="flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col overflow-ellipsis whitespace-nowrap mr-2 w-[220px]">
              <h3 className="text-base-regular overflow-hidden text-ellipsis">
                <LocalizedClientLink
                  href={`/products/${item.product_handle}`}
                  data-testid="product-link"
                >
                  {item.title}
                </LocalizedClientLink>
              </h3>
              <LineItemOptions
                variant={item.variant}
                data-testid="cart-item-variant"
                data-value={item.variant}
              />
              <div className="mt-1.5">
                <QuantityStepper
                  lineId={item.id}
                  quantity={item.quantity}
                  max={maxQuantity}
                  onUpdateError={setError}
                  size="sm"
                  data-testid="cart-item-quantity"
                />
              </div>
              {/* Reserved line: stock warning / server error without reflow. */}
              <div className="mt-1 min-h-4">
                {error ? (
                  <ErrorMessage
                    error={error}
                    data-testid="cart-item-error-message"
                  />
                ) : (
                  stockLimited &&
                  item.quantity >= maxQuantity && (
                    <span className="text-[11px] text-ui-fg-subtle">
                      Only {maxQuantity} available in stock
                    </span>
                  )
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <LineItemPrice
                item={item}
                style="tight"
                currencyCode={currencyCode}
              />
              <DeleteButton
                id={item.id}
                quantity={item.quantity}
                className="mt-0 justify-end"
                data-testid="cart-item-remove-button"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined,
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)
  const { extra, reset } = useCartCount()

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  // Badge follows optimistic bumps instantly; any server update absorbs
  // back into the baseline so drift can never stick.
  const displayedItems = Math.max(0, totalItems + extra)

  useEffect(() => {
    reset()
  }, [totalItems, reset])

  const subtotal = cartState?.subtotal ?? 0
  // The StoreCart type lags the API (which returns discount_subtotal —
  // the cart page renders it today), so read through the same optional
  // shape CartTotals declares rather than fighting the stale type.
  const amounts = cartState as unknown as {
    subtotal?: number | null
    item_subtotal?: number | null
    discount_subtotal?: number | null
  } | null
  // Same basis as the cart page ("Subtotal excl. shipping and taxes" there
  // reads item_subtotal): the raw `subtotal` field includes the shipping
  // amount, which is why the dropdown used to read higher.
  const itemsTotal = amounts?.item_subtotal ?? subtotal
  // Same formula as the cart page (pre-shipping context): items minus
  // discount, so the dropdown total always matches the cart total.
  const discount = amounts?.discount_subtotal ?? 0
  const dropdownTotal = itemsTotal - discount
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  // open cart dropdown when modifying the cart items, but only if we're not on the cart page
  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current])

  return (
    <div
      className="h-full z-50"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <PopoverButton className="h-full">
          <LocalizedClientLink
            className="hover:text-ui-fg-base flex items-center rounded-md p-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 hover:bg-muted active:scale-95"
            href="/cart"
            aria-label={`Cart (${displayedItems})`}
            data-testid="nav-cart-link"
          >
            <CartNavIcon count={displayedItems} />
            <span className="sr-only">{`Cart (${displayedItems})`}</span>
          </LocalizedClientLink>
        </PopoverButton>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+1px)] right-0 bg-popover border-x border-b border-border w-[420px] text-popover-foreground"
            data-testid="nav-cart-dropdown"
          >
            <div className="p-3 flex items-center justify-center">
              <h3 className="text-large-semi">Cart</h3>
            </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className="overflow-y-scroll max-h-[402px] px-3 grid grid-cols-1 gap-y-5 no-scrollbar p-px">
                  {cartState.items
                    .sort((a, b) => {
                      return (a.created_at ?? "") > (b.created_at ?? "")
                        ? -1
                        : 1
                    })
                    .map((item) => (
                      <DropdownLineItem
                        key={item.id}
                        item={item}
                        currencyCode={cartState.currency_code}
                      />
                    ))}
                </div>
                <div className="p-3 flex flex-col gap-y-3 text-small-regular">
                  <div className="flex items-center justify-between">
                    <span className="text-ui-fg-base font-semibold">
                      Subtotal{" "}
                      <span className="font-normal">
                        (excl. shipping and taxes)
                      </span>
                    </span>
                    <span
                      className="text-large-semi"
                      data-testid="cart-subtotal"
                      data-value={itemsTotal}
                    >
                      {convertToLocale({
                        amount: itemsTotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>
                  {!!discount && (
                    <div className="flex items-center justify-between">
                      <span className="text-ui-fg-base">Discount</span>
                      <span
                        className="text-ui-fg-interactive"
                        data-testid="cart-discount"
                        data-value={discount}
                      >
                        -{" "}
                        {convertToLocale({
                          amount: discount,
                          currency_code: cartState.currency_code,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-ui-fg-base font-semibold">Total</span>
                    <span
                      className="text-large-semi"
                      data-testid="cart-total"
                      data-value={dropdownTotal}
                    >
                      {convertToLocale({
                        amount: dropdownTotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>
                    <LocalizedClientLink href="/cart" passHref>
                      <Button
                        className="w-full"
                        data-testid="go-to-cart-button"
                      >
                        Go to cart
                      </Button>
                    </LocalizedClientLink>
                </div>
              </>
            ) : (
              <div>
                <div className="flex py-10 flex-col gap-y-4 items-center justify-center">
                  <div className="bg-primary text-small-regular flex items-center justify-center w-6 h-6 rounded-full text-primary-foreground">
                    <span>0</span>
                  </div>
                  <span>Your shopping bag is empty.</span>
                  <div>
                    <LocalizedClientLink href="/store">
                      <>
                        <span className="sr-only">Go to all products page</span>
                        <Button onClick={close}>Explore products</Button>
                      </>
                    </LocalizedClientLink>
                  </div>
                </div>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown

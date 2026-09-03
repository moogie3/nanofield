"use client"

import { Heading } from "@modules/common/components/ui"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart }: SummaryProps) => {
  const step = getCheckoutStep(cart)

  return (
    <Card>
      <CardContent className="flex flex-col gap-y-4">
        <Heading level="h2" className="text-[2rem] leading-[2.75rem]">
          Summary
        </Heading>
        <DiscountCode cart={cart} />
        <Divider />
        <CartTotals totals={cart} />
        <Button asChild size="lg" className="w-full">
          <LocalizedClientLink
            href={"/checkout?step=" + step}
            data-testid="checkout-button"
          >
            Go to checkout
          </LocalizedClientLink>
        </Button>
      </CardContent>
    </Card>
  )
}

export default Summary

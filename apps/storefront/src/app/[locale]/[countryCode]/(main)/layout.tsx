import { Metadata } from "next"

import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getStoreContact } from "@lib/data/store-contact"
import { whatsappUrl } from "@lib/store-contact"
import { getBaseURL } from "@lib/util/env"
import { StoreCartShippingOption } from "@medusajs/types"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import { CartCountProvider } from "@modules/common/components/cart-count"
import ChatWidget from "@modules/common/components/chat-widget"
import ContactCta from "@modules/common/components/contact-cta"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"
import { getLocale } from "next-intl/server"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  const customer = await retrieveCustomer()
  const cart = await retrieveCart()
  const locale = await getLocale()
  const contact = await getStoreContact(locale)
  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    const { shipping_options } = await listCartOptions()

    shippingOptions = shipping_options
  }

  return (
    <>
      <CartCountProvider>
        <Nav />
        {customer && cart && (
          <CartMismatchBanner customer={customer} cart={cart} />
        )}

        {cart && (
          <FreeShippingPriceNudge
            variant="popup"
            cart={cart}
            shippingOptions={shippingOptions}
          />
        )}
        {props.children}
      </CartCountProvider>
      <ContactCta whatsappHref={whatsappUrl(contact)} />
      <ChatWidget whatsappHref={whatsappUrl(contact)} />
      <Footer />
    </>
  )
}

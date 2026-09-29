import { getTranslations } from "next-intl/server"
import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PageHeader from "@modules/common/components/page-header"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { pageMeta } from "@lib/util/locale-metadata"
import { notFound, redirect } from "next/navigation"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}): Promise<Metadata> {
  const { locale, countryCode } = await params
  return pageMeta(
    locale,
    countryCode,
    "/checkout",
    "checkoutTitle",
    "checkoutDesc"
  )
}

export default async function Checkout(props: {
  params: Promise<{ locale: string; countryCode: string }>
}) {
  const params = await props.params
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  // Price-on-login gate, last line: checkout requires a (verified) account.
  // Guests keep their cart cookie and land back here after signing in.
  if (!customer) {
    redirect(
      `/${params.locale}/${params.countryCode}/account?return_to=${encodeURIComponent(`/${params.locale}/${params.countryCode}/checkout`)}`
    )
  }

  const t = await getTranslations("checkout")

  return (
    <div className="content-container py-12">
      <div className="mb-8">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
        />
      </div>
      <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] gap-x-40">
        <PaymentWrapper cart={cart}>
          <CheckoutForm cart={cart} customer={customer} />
        </PaymentWrapper>
        <CheckoutSummary cart={cart} />
      </div>
    </div>
  )
}

import { getTranslations } from "next-intl/server"
import { pageMeta } from "@lib/util/locale-metadata"
import { Metadata } from "next"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"
import PageHeader from "@modules/common/components/page-header"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}): Promise<Metadata> {
  const { locale, countryCode } = await params
  return pageMeta(
    locale,
    countryCode,
    "/account/addresses",
    "addressesTitle",
    "addressesDesc"
  )
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  const t = await getTranslations("account.pages")

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-8">
        <PageHeader
          eyebrow={t("profileEyebrow")}
          title={t("addressesTitle")}
          subtitle={t("addressesSubtitle")}
        />
      </div>
      <AddressBook customer={customer} region={region} />
    </div>
  )
}

import { getTranslations } from "next-intl/server"
import { pageMeta } from "@lib/util/locale-metadata"
import { Metadata } from "next"
import { Suspense } from "react"

import VerifyAccount from "@modules/account/components/verify-account"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}): Promise<Metadata> {
  const { locale, countryCode } = await params
  return pageMeta(
    locale,
    countryCode,
    "/verify-account",
    "verifyTitle",
    "verifyDesc"
  )
}

export default async function VerifyAccountPage() {
  const t = await getTranslations("account.verifyResult")
  return (
    <div className="w-full flex justify-center px-8 py-12">
      <Suspense
        fallback={
          <p className="text-base-regular text-ui-fg-base">
            {t("verifyingShort")}
          </p>
        }
      >
        <VerifyAccount />
      </Suspense>
    </div>
  )
}

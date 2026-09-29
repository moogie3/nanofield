import { getTranslations } from "next-intl/server"
import PageLoader from "@modules/common/components/page-loader"

export default async function Loading() {
  const t = await getTranslations("common")
  return <PageLoader label={t("loadingCheckout")} />
}

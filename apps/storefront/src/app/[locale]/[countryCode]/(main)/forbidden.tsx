import { getTranslations } from "next-intl/server"
import { Metadata } from "next"

import ErrorScreen from "@modules/common/components/error-screen"
import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: "403",
  description: "Access denied",
}

export default async function Forbidden() {
  const t = await getTranslations("errors")
  return (
    <ErrorScreen
      code="403"
      title={t("forbiddenTitle")}
      cause={t("forbiddenBody")}
      action={<InteractiveLink href="/">{t("frontpage")}</InteractiveLink>}
    />
  )
}

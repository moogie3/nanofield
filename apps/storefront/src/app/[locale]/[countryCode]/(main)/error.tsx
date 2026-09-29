"use client"

import { useTranslations } from "next-intl"
import ErrorScreen from "@modules/common/components/error-screen"
import InteractiveLink from "@modules/common/components/interactive-link"
import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const t = useTranslations("errors")

  return (
    <ErrorScreen
      code="500"
      title={t("errorTitle")}
      cause={error.message || t("errorBody")}
      action={<InteractiveLink href="/">{t("frontpage")}</InteractiveLink>}
      onRetry={reset}
      retryLabel={t("retry")}
    />
  )
}

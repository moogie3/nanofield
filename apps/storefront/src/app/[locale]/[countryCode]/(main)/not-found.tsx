import { getRequestMessages } from "@lib/util/server-locale"
import { Metadata } from "next"

import ErrorScreen from "@modules/common/components/error-screen"
import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default async function NotFound() {
  // Header-based messages: this boundary renders outside the [locale]
  // layout tree, so next-intl's requestLocale is unreliable here.
  const { messages } = await getRequestMessages()
  const t = messages.errors
  return (
    <ErrorScreen
      code="404"
      title={t.notFoundTitle}
      cause={t.notFoundBody}
      action={<InteractiveLink href="/">{t.frontpage}</InteractiveLink>}
    />
  )
}

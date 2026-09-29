import { getRequestMessages } from "@lib/util/server-locale"
import { Metadata } from "next"

import ErrorScreen from "@modules/common/components/error-screen"
import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default async function NotFound() {
  const { messages } = await getRequestMessages()
  const t = messages.errors
  return (
    <ErrorScreen
      code="404"
      title={t.notFoundTitle}
      cause={t.cartNotFound}
      action={<InteractiveLink href="/">{t.frontpage}</InteractiveLink>}
    />
  )
}

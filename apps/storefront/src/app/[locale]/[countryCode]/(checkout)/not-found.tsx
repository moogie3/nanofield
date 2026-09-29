import { getRequestMessages } from "@lib/util/server-locale"
import ErrorScreen from "@modules/common/components/error-screen"
import InteractiveLink from "@modules/common/components/interactive-link"
import { Metadata } from "next"

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
      cause={t.notFoundBody}
      action={<InteractiveLink href="/">{t.frontpage}</InteractiveLink>}
    />
  )
}

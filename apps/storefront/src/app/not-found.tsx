import { getRequestMessages } from "@lib/util/server-locale"
import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@modules/common/components/ui"
import ErrorScreen from "@modules/common/components/error-screen"
import { Metadata } from "next"
import Link from "next/link"

// Rendered on demand, never prerendered: error boundaries depend on
// request-time context (see getRequestMessages below).
export const dynamic = "force-dynamic"

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
      action={
        <Link className="flex gap-x-1 items-center group" href="/">
          <Text className="text-ui-fg-interactive">{t.frontpage}</Text>
          <ArrowUpRightMini
            className="group-hover:rotate-45 ease-in-out duration-150"
            color="var(--fg-interactive)"
          />
        </Link>
      }
    />
  )
}

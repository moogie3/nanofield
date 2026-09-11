import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@modules/common/components/ui"
import ErrorScreen from "@modules/common/components/error-screen"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Page not found"
      cause="The page you tried to access does not exist. It may have been moved, deleted, or you may have followed a broken link."
      action={
        <Link className="flex gap-x-1 items-center group" href="/">
          <Text className="text-ui-fg-interactive">Go to frontpage</Text>
          <ArrowUpRightMini
            className="group-hover:rotate-45 ease-in-out duration-150"
            color="var(--fg-interactive)"
          />
        </Link>
      }
    />
  )
}

import ErrorScreen from "@modules/common/components/error-screen"
import InteractiveLink from "@modules/common/components/interactive-link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default async function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Page not found"
      cause="The page you tried to access does not exist. It may have been moved, deleted, or you may have followed a broken link."
      action={<InteractiveLink href="/">Go to frontpage</InteractiveLink>}
    />
  )
}

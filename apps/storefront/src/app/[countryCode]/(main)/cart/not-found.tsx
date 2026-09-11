import { Metadata } from "next"

import ErrorScreen from "@modules/common/components/error-screen"
import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Page not found"
      cause="The cart you tried to access does not exist. Clear your cookies and try again."
      action={<InteractiveLink href="/">Go to frontpage</InteractiveLink>}
    />
  )
}

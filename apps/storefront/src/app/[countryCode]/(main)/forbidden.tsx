import { Metadata } from "next"

import ErrorScreen from "@modules/common/components/error-screen"
import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: "403",
  description: "Access denied",
}

export default function Forbidden() {
  return (
    <ErrorScreen
      code="403"
      title="Access denied"
      cause="You don't have permission to view this page. Try logging in with a different account, or contact support if you believe this is a mistake."
      action={<InteractiveLink href="/">Go to frontpage</InteractiveLink>}
    />
  )
}

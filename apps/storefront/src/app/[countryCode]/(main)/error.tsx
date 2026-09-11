"use client"

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

  return (
    <ErrorScreen
      code="500"
      title="Something went wrong"
      cause={
        error.message ||
        "An unexpected error occurred while loading this page. Please try again, and contact support if the problem persists."
      }
      action={<InteractiveLink href="/">Go to frontpage</InteractiveLink>}
      onRetry={reset}
    />
  )
}

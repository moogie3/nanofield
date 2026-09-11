"use client"

import { Button } from "@modules/common/components/ui"
import PageBackdrop from "@modules/common/components/page-backdrop"
import React from "react"

type ErrorScreenProps = {
  code: string
  title: string
  cause: string
  action: React.ReactNode
  onRetry?: () => void
  retryLabel?: string
}

const ErrorScreen = ({
  code,
  title,
  cause,
  action,
  onRetry,
  retryLabel = "Try again",
}: ErrorScreenProps) => {
  return (
    <div
      className="relative flex flex-col items-center justify-center text-center min-h-[calc(100vh-64px)] px-6 py-16 overflow-hidden"
      data-testid="error-screen"
    >
      <PageBackdrop swarm />
      <div className="relative flex flex-col items-center">
      <span
        className="nav-wordmark uppercase font-heading font-bold text-primary text-2xl"
        aria-hidden
      >
        Nanofield
      </span>
      <p
        className="mt-6 text-7xl font-heading font-bold text-ui-fg-base"
        data-testid="error-code"
      >
        {code}
      </p>
      <h1
        className="mt-4 text-2xl-semi text-ui-fg-base"
        data-testid="error-title"
      >
        {title}
      </h1>
      <p
        className="mt-2 max-w-md text-small-regular text-ui-fg-subtle"
        data-testid="error-cause"
      >
        {cause}
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        {action}
        {onRetry && (
          <Button
            variant="secondary"
            onClick={onRetry}
            data-testid="error-retry-button"
          >
            {retryLabel}
          </Button>
        )}
      </div>
      </div>
    </div>
  )
}

export default ErrorScreen

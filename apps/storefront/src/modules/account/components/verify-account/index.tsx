"use client"

import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@modules/common/components/ui"
import { confirmEmailVerification } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type VerificationState = "verifying" | "success" | "error"

const iconClass =
  "flex h-16 w-16 items-center justify-center rounded-full"

const VerifyingIcon = () => (
  <span className={`${iconClass} bg-muted text-ui-fg-subtle`}>
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  </span>
)

const SuccessIcon = () => (
  <span className={`${iconClass} bg-primary/15 text-primary`}>
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  </span>
)

const ErrorIcon = () => (
  <span className={`${iconClass} bg-destructive/10 text-destructive`}>
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  </span>
)

const VerifyAccount = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<VerificationState>("verifying")
  // Guard against the effect running twice in React Strict Mode, which would
  // consume the single-use token before the customer sees the result.
  const confirmed = useRef(false)
  const t = useTranslations("account.verifyResult")

  useEffect(() => {
    if (confirmed.current) {
      return
    }
    confirmed.current = true

    if (!token) {
      setState("error")
      return
    }

    confirmEmailVerification(token).then(({ success }) =>
      setState(success ? "success" : "error")
    )
  }, [token])

  return (
    <div
      className="w-full max-w-md flex flex-col items-center text-center gap-y-4 rounded-2xl border border-border bg-card px-8 py-12"
      data-testid="verify-account-page"
    >
      {state === "verifying" && <VerifyingIcon />}
      {state === "success" && <SuccessIcon />}
      {state === "error" && <ErrorIcon />}

      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground small:text-3xl">
        {state === "success" ? t("doneTitle") : t("pendingTitle")}
      </h1>

      {state === "verifying" && (
        <p className="text-base-regular text-ui-fg-subtle">
          {t("verifying")}
        </p>
      )}

      {state === "success" && (
        <>
          <p className="text-base-regular text-ui-fg-base">
            {t("successBody")}
          </p>
          <LocalizedClientLink href="/account" className="mt-2">
            <Button variant="primary">{t("goSignIn")}</Button>
          </LocalizedClientLink>
        </>
      )}

      {state === "error" && (
        <>
          <p className="text-base-regular text-ui-fg-base">
            {t("errorBody")}
          </p>
          <p className="text-small-regular text-ui-fg-subtle">
            {t("errorHint")}
          </p>
          <LocalizedClientLink href="/account" className="mt-2">
            <Button variant="secondary">{t("goSignIn")}</Button>
          </LocalizedClientLink>
        </>
      )}
    </div>
  )
}

export default VerifyAccount

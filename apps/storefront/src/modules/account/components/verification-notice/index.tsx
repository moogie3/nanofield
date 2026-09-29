"use client"

import { useTranslations } from "next-intl"

// Prominent "check your inbox" panel shown after register/login returns
// verification_required. Register renders it instead of the form; login
// renders it above the form. Testid is caller-specific so existing
// specs keep passing. Client-side (hook) because both callers live in the
// client login/register tree — an async server component cannot render here.
export default function VerificationNotice({
  email,
  testId,
}: {
  email: string
  testId: string
}) {
  const t = useTranslations("account.notice")
  return (
    <div
      className="w-full flex flex-col items-center text-center gap-y-3 rounded-2xl border border-primary/30 bg-primary/10 px-6 py-8"
      data-testid={testId}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
      </span>
      <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
        {t("title")}
      </h2>
      <p className="text-base-regular text-ui-fg-base">
        {t("body", { email })}
      </p>
      <p className="text-small-regular text-ui-fg-subtle">{t("hint")}</p>
    </div>
  )
}

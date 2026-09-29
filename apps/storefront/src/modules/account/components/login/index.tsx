import { login } from "@lib/data/customer"
import { useTranslations } from "next-intl"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import VerificationNotice from "@modules/account/components/verification-notice"
import { useActionState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

// Internal return path only — never follow an external URL from ?return_to.
const safeReturnTo = (value: string | null): string | null =>
  value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : null

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = safeReturnTo(searchParams.get("return_to"))
  const t = useTranslations("account.login")

  // Price-gate CTA lands here with ?return_to=<product>; send the shopper
  // back after a successful sign-in instead of stranding them on /account.
  useEffect(() => {
    if (message?.state === "success" && returnTo) {
      router.push(returnTo)
    }
  }, [message, returnTo, router])

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="login-page"
    >
      <h1 className="text-large-semi uppercase mb-6">{t("title")}</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        {t("subtitle")}
      </p>
      {message?.state === "verification_required" && (
        <div className="w-full mb-6">
          <VerificationNotice
            email={message.email}
            testId="login-verification-message"
          />
        </div>
      )}
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={t("email")}
            name="email"
            type="email"
            title={t("emailHint")}
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label={t("password")}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="login-error-message"
        />
        <SubmitButton data-testid="sign-in-button" className="w-full mt-6">
          {t("signIn")}
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t("notMember")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="underline"
          data-testid="register-button"
        >
          {t("join")}
        </button>
        .
      </span>
    </div>
  )
}

export default Login

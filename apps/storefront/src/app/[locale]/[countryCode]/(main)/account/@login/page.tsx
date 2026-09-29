import { Metadata } from "next"
import { pageMeta } from "@lib/util/locale-metadata"

import LoginTemplate from "@modules/account/templates/login-template"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}): Promise<Metadata> {
  const { locale, countryCode } = await params
  return pageMeta(locale, countryCode, "/account", "loginTitle", "loginDesc")
}

export default function Login() {
  return <LoginTemplate />
}

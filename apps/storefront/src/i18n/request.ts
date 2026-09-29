import { getRequestConfig } from "next-intl/server"
import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale resolves (in order): setRequestLocale() [unreliable here —
  // see middleware NEXT_INTL_LOCALE_HEADER comment], then the
  // X-NEXT-INTL-LOCALE request header set by our middleware from the URL.
  const rawLocale = await requestLocale
  let locale = rawLocale

  if (!locale || !routing.locales.includes(locale as AppLocaleType)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})

type AppLocaleType = (typeof routing.locales)[number]

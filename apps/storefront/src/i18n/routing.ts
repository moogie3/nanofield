import { defineRouting } from "next-intl/routing"

// URL-prefixed locales for SEO (locale-distinct URLs + hreflang).
// Language (locale) and region (countryCode) are independent:
// e.g. /id/id/store = Indonesian language, Indonesia region;
// /en/id/store = English language, Indonesia region (IDR pricing).
export const routing = defineRouting({
  locales: ["id", "en"],
  defaultLocale: "id",
  // "always" so every URL carries its locale: /id/... and /en/...
  localePrefix: "always",
})

export type AppLocale = (typeof routing.locales)[number]

import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Metadata } from "next"
import { getBaseURL } from "@lib/util/env"
import { routing } from "@/i18n/routing"

// Builds locale-aware SEO metadata for a page whose canonical path (without
// the /<locale> prefix) is known: absolute canonical + hreflang alternates
// (id / en / x-default → Indonesian, the primary market language).
export function localeAlternates(pathWithoutLocale: string): {
  canonical: string
  languages: Record<string, string>
} {
  const base = getBaseURL().replace(/\/$/, "")
  const path =
    pathWithoutLocale === "/" ? "" : pathWithoutLocale.startsWith("/") ? pathWithoutLocale : `/${pathWithoutLocale}`
  const urlFor = (locale: string) => `${base}/${locale}${path}`
  return {
    canonical: urlFor(routing.defaultLocale),
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, urlFor(l)])),
      "x-default": urlFor(routing.defaultLocale),
    },
  }
}

/** Full per-page metadata: translated title/description + alternates. */
export function localizedPageMeta(
  pathWithoutLocale: string,
  title: string,
  description: string
): Metadata {
  return {
    title,
    description,
    alternates: localeAlternates(pathWithoutLocale),
  }
}

export type MetaKey = keyof (typeof import("@/messages/en.json"))["meta"]
// One-liner for pages: locale + country from route params, title/desc keys
// from the meta namespace, canonical + hreflang for the page path.
export async function pageMeta(
  locale: string,
  countryCode: string,
  pathSuffix: string,
  titleKey: MetaKey,
  descKey: MetaKey
): Promise<Metadata> {
  setRequestLocale(locale)
  const t = await getTranslations("meta")
  return localizedPageMeta(
    `/${countryCode}${pathSuffix}`,
    t(titleKey),
    t(descKey)
  )
}

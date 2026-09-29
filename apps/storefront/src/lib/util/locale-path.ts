import { routing, type AppLocale } from "@/i18n/routing"
import {
  LOCALE_COOKIE_NAME,
  detectLocaleFromHeader as detectFromHeader,
} from "@/i18n/locale-cookie"

export const SUPPORTED_LOCALES: readonly string[] = routing.locales
export const DEFAULT_LOCALE: AppLocale = routing.defaultLocale
export { LOCALE_COOKIE_NAME }

/** True when the segment is a supported locale (id, en). */
export function isLocale(segment: string | undefined | null): boolean {
  return !!segment && (SUPPORTED_LOCALES as string[]).includes(segment)
}

/**
 * Parses Accept-Language into a supported locale.
 * Defaults to Indonesian (primary market) for anything unrecognized.
 */
export function detectLocaleFromHeader(
  acceptLanguage: string | null
): AppLocale {
  return detectFromHeader(
    acceptLanguage,
    SUPPORTED_LOCALES,
    DEFAULT_LOCALE
  ) as AppLocale
}

/**
 * Prefixes a storefront path with the locale: "/store" -> "/id/store".
 * Already-prefixed paths pass through unchanged. Query strings preserved.
 */
export function localizePath(path: string, locale: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  const first = normalized.split("/")[1]
  if (isLocale(first)) {
    return normalized
  }
  return `/${locale}${normalized === "/" ? "" : normalized}`
}

/**
 * Strips a leading /<locale> segment: "/id/dk/store" -> "/dk/store".
 * Non-prefixed paths pass through unchanged.
 */
export function stripLocalePrefix(path: string): string {
  const first = path.split("/")[1]
  if (isLocale(first)) {
    const rest = path.replace(new RegExp(`^/${first}`, "i"), "")
    return rest || "/"
  }
  return path
}

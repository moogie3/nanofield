import "server-only"

import { cookies, headers } from "next/headers"
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  detectLocaleFromHeader,
  isLocale,
  localizePath,
} from "./locale-path"
import type { AppLocale } from "@/i18n/routing"
import type enMessages from "@/messages/en.json"

/**
 * Resolves the active locale in server context (server components,
 * server actions, route handlers). Priority:
 * 1. NEXT_LOCALE cookie (kept in sync with the URL by middleware)
 * 2. Accept-Language header
 * 3. Default (Indonesian)
 */
export async function getActiveLocale(): Promise<AppLocale> {
  try {
    const store = await cookies()
    const cookieLocale = store.get(LOCALE_COOKIE_NAME)?.value?.toLowerCase()
    if (isLocale(cookieLocale)) {
      return cookieLocale as AppLocale
    }
  } catch {
    // cookies() unavailable (e.g. certain prerender contexts) — fall through
  }

  try {
    const headerStore = await headers()
    return detectLocaleFromHeader(headerStore.get("accept-language"))
  } catch {
    return DEFAULT_LOCALE
  }
}

/** Prefixes a storefront path with the active locale (server-safe). */
export async function localizeServerPath(path: string): Promise<string> {
  const locale = await getActiveLocale()
  return localizePath(path, locale)
}

type Messages = typeof enMessages

/**
 * Loads the message dictionary for the request URL locale, read from the
 * middleware-set header — NOT from next-intl's requestLocale. This is the
 * deterministic source for error boundaries (not-found/error), which render
 * outside the [locale] layout tree where setRequestLocale never runs.
 */
export async function getRequestMessages(): Promise<{
  locale: AppLocale
  messages: Messages
}> {
  let headerLocale: string | null = null
  try {
    headerLocale = (await headers()).get("x-nanofield-locale")
  } catch {
    // prerender without request context — fall through to default
  }
  const locale = isLocale(headerLocale)
    ? (headerLocale as AppLocale)
    : DEFAULT_LOCALE
  const messages = (
    await import(`@/messages/${locale}.json`)
  ).default as Messages
  return { locale, messages }
}

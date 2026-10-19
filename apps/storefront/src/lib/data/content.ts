"use server"

import { cache } from "react"
import { sdk } from "@lib/config"

export type SiteSettings = Record<string, string>

// Memoized per render pass: several components read settings on one page
// (footer tagline, hero, contact channels), and they all share one request.
const fetchSiteSettings = cache(
  async (locale: string): Promise<SiteSettings> => {
    return await sdk.client
      .fetch<{ settings?: SiteSettings }>(`/store/content/settings`, {
        method: "GET",
        query: { locale },
        cache: "no-store",
      })
      .then(({ settings }) => settings ?? {})
      .catch(() => ({}))
  }
)

// Public storefront settings for one locale (GET /store/content/settings,
// publishable key only �?" no login needed). The backend already applies the
// locale fallback (en over id), so this returns exactly what is set; an unset
// key is simply absent, leaving the caller to use its built-in default.
// Never throws: pages render with or without backend settings. Uncached on
// purpose �?" admin edits must show on the very next visit, and the payload is
// a handful of short strings.
export const getSiteSettings = async (
  locale: string
): Promise<SiteSettings> => fetchSiteSettings(locale)

export type ContentPage = {
  slug: string
  locale: string
  title: string
  subtitle: string
  body: string
  data?: Record<string, unknown> | null
  seo_title: string
  seo_description: string
  updated_at: number | null
}

// One CMS page for a locale (GET /store/content/pages?slug=&locale=). The
// backend already applied the locale fallback and published filter, so a
// non-null result is ready to render. Null means "no CMS page" — the caller
// falls back to its built-in copy. Never throws.
export const getContentPage = async (
  slug: string,
  locale: string
): Promise<ContentPage | null> => {
  return await sdk.client
    .fetch<{ page?: ContentPage | null }>(`/store/content/pages`, {
      method: "GET",
      query: { slug, locale },
      cache: "no-store",
    })
    .then(({ page }) => page ?? null)
    .catch(() => null)
}

// Every published CMS page for a locale (title/subtitle only are needed by
// navigation and sitemaps). Never throws.
export const getContentPages = async (
  locale: string
): Promise<ContentPage[]> => {
  return await sdk.client
    .fetch<{ pages?: ContentPage[] }>(`/store/content/pages`, {
      method: "GET",
      query: { locale },
      cache: "no-store",
    })
    .then(({ pages }) => pages ?? [])
    .catch(() => [])
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  CONTENT_KEYS,
  DEFAULT_CONTENT_LOCALE,
  isContentKey,
  isContentLocale,
  mergeLocaleSettings,
  resolveContentDefault,
} from "../../../../modules/content/keys"
import { resolveContent } from "../../../../modules/content/resolve"

// Public storefront settings for one locale (?locale=, defaults to id). The
// default locale is the fallback base: a missing value in en resolves to its
// id value, and a missing value overall resolves to the catalog's built-in
// default — so the storefront always receives a complete set and the admin
// previews exactly what is live. Never throws — empty object on any failure.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const requested = String(
      (req as any).locale ?? req.query?.locale ?? DEFAULT_CONTENT_LOCALE
    )
    const locale = isContentLocale(requested)
      ? requested
      : DEFAULT_CONTENT_LOCALE
    const rows = await resolveContent(req).listSiteSettings({})
    const byLocale: Record<string, Record<string, string>> = {}
    for (const row of rows) {
      if (!isContentKey(row.key)) {
        continue
      }
      byLocale[row.locale] = byLocale[row.locale] || {}
      byLocale[row.locale][row.key] = row.value
    }
    const defaults = byLocale[DEFAULT_CONTENT_LOCALE] || {}
    const stored =
      locale === DEFAULT_CONTENT_LOCALE
        ? { ...defaults }
        : mergeLocaleSettings(defaults, byLocale[locale] || {})
    const settings: Record<string, string> = {}
    for (const [key, def] of Object.entries(CONTENT_KEYS)) {
      const value = stored[key]
      settings[key] = value && value.length ? value : resolveContentDefault(def, locale)
    }
    res.status(200).json({ settings })
  } catch {
    res.status(200).json({ settings: {} })
  }
}

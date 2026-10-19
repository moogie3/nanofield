import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  CONTENT_KEYS,
  CONTENT_LOCALES,
  DEFAULT_CONTENT_LOCALE,
  isContentKey,
  resolveContentDefault,
} from "../../../../modules/content/keys"
import { resolveContent, type SiteSettingRow } from "../../../../modules/content/resolve"

// Editor payload: the field catalog (with the built-in default for every
// locale, so an empty field still shows what the storefront currently renders)
// plus every stored value bucketed by locale. The admin page renders one form
// per locale from this alone.
const catalog = () =>
  Object.entries(CONTENT_KEYS).map(([key, def]) => ({
    key,
    label: def.label,
    hint: def.hint,
    maxLen: def.maxLen,
    multiline: def.multiline,
    defaults: Object.fromEntries(
      CONTENT_LOCALES.map((locale) => [locale, resolveContentDefault(def, locale)])
    ),
  }))

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  let rows: SiteSettingRow[]
  try {
    rows = await resolveContent(req).listSiteSettings({})
  } catch (e) {
    const cause = (e as Error)?.message || String(e)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      cause.includes("not loaded")
        ? "content store is unavailable — restart the backend so migrations apply"
        : `content store error: ${cause}`
    )
  }
  const values: Record<string, Record<string, string>> = {}
  for (const locale of CONTENT_LOCALES) {
    values[locale] = {}
  }
  for (const row of rows) {
    if (!isContentKey(row.key)) {
      continue
    }
    values[row.locale] = values[row.locale] || {}
    values[row.locale][row.key] = row.value
  }
  res.status(200).json({
    catalog: catalog(),
    locales: CONTENT_LOCALES,
    defaultLocale: DEFAULT_CONTENT_LOCALE,
    values,
  })
}

// Upserts one locale's values. Known keys only; unknown keys are ignored and
// values are clamped to the catalog's maxLen. An empty value clears the row so
// the storefront falls back to its built-in default (and, for a non-default
// locale, to the default locale).
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as {
    locale?: unknown
    values?: Record<string, unknown>
  }
  const locale = String(body.locale ?? "")
  if (!(CONTENT_LOCALES as readonly string[]).includes(locale)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `locale must be one of: ${CONTENT_LOCALES.join(", ")}`
    )
  }
  const incoming = body.values || {}
  const svc = resolveContent(req)

  for (const [key, def] of Object.entries(CONTENT_KEYS)) {
    const raw = incoming[key]
    if (raw === undefined) {
      continue
    }
    const value = String(raw).trim().slice(0, def.maxLen)
    const existing = await svc.listSiteSettings({ key, locale })
    if (existing.length) {
      if (value) {
        await svc.updateSiteSettings({ id: existing[0].id, value })
      } else {
        await svc.deleteSiteSettings(existing[0].id)
      }
    } else if (value) {
      await svc.createSiteSettings({ key, locale, value })
    }
  }

  const rows = await svc.listSiteSettings({})
  const values: Record<string, Record<string, string>> = {}
  for (const row of rows) {
    if (!isContentKey(row.key)) {
      continue
    }
    values[row.locale] = values[row.locale] || {}
    values[row.locale][row.key] = row.value
  }
  res.status(200).json({ locales: CONTENT_LOCALES, values })
}

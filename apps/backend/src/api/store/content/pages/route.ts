import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  DEFAULT_CONTENT_LOCALE,
  isContentLocale,
} from "../../../../modules/content/keys"
import { resolveContent } from "../../../../modules/content/resolve"
import { toStorePage } from "../../../../modules/content/serialize"
import {
  listPublishedPages,
  pickContentPage,
} from "../../../../modules/content/store-pages"

// Public storefront pages for one locale (?locale=, defaults to id).
// The framework's applyLocale middleware consumes the `locale` query param and
// sets `req.locale`; this route prefers `req.locale` and falls back to
// `req.query.locale` as a safety net.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const slugParam = req.query.slug ? String(req.query.slug) : ""
  try {
    const requested = String((req as any).locale ?? req.query?.locale ?? DEFAULT_CONTENT_LOCALE)
    const locale = isContentLocale(requested)
      ? requested
      : DEFAULT_CONTENT_LOCALE
    const rows = await resolveContent(req).listContentPages({})

    if (slugParam) {
      const row = pickContentPage(rows, slugParam, locale)
      res.status(200).json({ page: row ? toStorePage(row) : null })
      return
    }

    res
      .status(200)
      .json({ pages: listPublishedPages(rows, locale).map(toStorePage) })
  } catch {
    res.status(200).json(slugParam ? { page: null } : { pages: [] })
  }
}

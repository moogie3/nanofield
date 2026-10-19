import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { parseContentPageInput } from "../../../../modules/content/page-input"
import { resolveContent } from "../../../../modules/content/resolve"
import { toAdminPage } from "../../../../modules/content/serialize"

const storeError = (e: unknown): MedusaError => {
  const cause = (e as Error)?.message || String(e)
  return new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    cause.includes("not loaded")
      ? "content store is unavailable — restart the backend so migrations apply"
      : `content store error: ${cause}`
  )
}

// Every page for every locale, slug then locale, so the editor groups a slug's
// language variants together.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  let rows
  try {
    rows = await resolveContent(req).listContentPages({})
  } catch (e) {
    throw storeError(e)
  }
  rows.sort((a, b) =>
    a.slug === b.slug ? (a.locale < b.locale ? -1 : 1) : a.slug < b.slug ? -1 : 1
  )
  res.status(200).json({ pages: rows.map(toAdminPage) })
}

// Creates one locale variant. A slug is unique per locale, so the same slug in
// the other language is a separate row managed from the same editor.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as Record<string, unknown>
  const input = parseContentPageInput(body, { partial: false })
  const svc = resolveContent(req)
  const existing = await svc.listContentPages({
    slug: input.slug,
    locale: input.locale,
  })
  if (existing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `a "${input.slug}" page already exists for ${input.locale}`
    )
  }
  const created = await svc.createContentPages({
    slug: input.slug,
    locale: input.locale,
    title: input.title,
    body: input.body ?? "",
    data: input.data ?? null,
    status: input.status ?? "published",
    ...(input.subtitle ? { subtitle: input.subtitle } : {}),
    ...(input.seo_title ? { seo_title: input.seo_title } : {}),
    ...(input.seo_description ? { seo_description: input.seo_description } : {}),
  })
  res.status(201).json({ page: toAdminPage(created) })
}

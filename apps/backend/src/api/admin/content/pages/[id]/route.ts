import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { parseContentPageInput } from "../../../../../modules/content/page-input"
import { resolveContent } from "../../../../../modules/content/resolve"
import { toAdminPage } from "../../../../../modules/content/serialize"

const retrieve = async (req: MedusaRequest, id: string) => {
  const rows = await resolveContent(req).listContentPages({ id })
  if (!rows.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `content page ${id} was not found`
    )
  }
  return rows[0]
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id || "")
  const page = await retrieve(req, id)
  res.status(200).json({ page: toAdminPage(page) })
}

// Partial update. Changing slug/locale re-checks the (slug, locale) uniqueness
// against every other row so a rename can't silently collide.
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id || "")
  const svc = resolveContent(req)
  const current = await retrieve(req, id)
  const input = parseContentPageInput(
    (req.body || {}) as Record<string, unknown>,
    { partial: true, existingSlug: current.slug }
  )
  const nextSlug = input.slug ?? current.slug
  const nextLocale = input.locale ?? current.locale
  if (nextSlug !== current.slug || nextLocale !== current.locale) {
    const clash = await svc.listContentPages({
      slug: nextSlug,
      locale: nextLocale,
    })
    if (clash.some((row) => row.id !== current.id)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `a "${nextSlug}" page already exists for ${nextLocale}`
      )
    }
  }
  const updated = await svc.updateContentPages({
    id: current.id,
    ...input,
  })
  res.status(200).json({ page: toAdminPage(updated) })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id || "")
  await retrieve(req, id)
  await resolveContent(req).deleteContentPages(id)
  res.status(200).json({ id, object: "content_page", deleted: true })
}

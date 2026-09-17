import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

type BannerRow = {
  id: string
  type: string
  title: string
}

type BannerOps = {
  listBanners: (filters?: Record<string, unknown>) => Promise<BannerRow[]>
  updateBanners: (data: Record<string, unknown>[]) => Promise<BannerRow[]>
}

const BANNER_KEYS = ["banner", "bannerModuleService"]

const banners = (req: MedusaRequest): BannerOps => {
  const resolve = req.scope.resolve as unknown as (
    key: string
  ) => BannerOps | null
  for (const key of BANNER_KEYS) {
    try {
      const svc = resolve(key)
      if (svc && typeof svc.listBanners === "function") {
        return svc
      }
    } catch {
      // try the next key
    }
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "banner module is not loaded"
  )
}

const parseDate = (v: unknown): string | null => {
  if (v === undefined || v === null || v === "") {
    return null
  }
  const t = new Date(String(v))
  if (!Number.isFinite(t.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `invalid date: ${String(v)} (use ISO format)`
    )
  }
  return t.toISOString()
}

// Publish toggle + date/copy edits. No delete by decision — unpublish flips
// is_published and the row stays as history.
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id || "")
  const ops = banners(req)
  const existing = (await ops.listBanners({ id })).find((b) => b.id === id)
  if (!existing) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `no banner with id ${id}`
    )
  }
  const body = (req.body || {}) as Record<string, unknown>
  const patch: Record<string, unknown> = { id }
  if (body.title !== undefined) {
    const title = String(body.title).trim().slice(0, 120)
    if (!title) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "title cannot be empty"
      )
    }
    patch.title = title
  }
  if (body.description !== undefined) {
    patch.description = String(body.description).trim().slice(0, 500)
  }
  if (body.link !== undefined) {
    const link = String(body.link).trim().slice(0, 200)
    if (link && !link.startsWith("/")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "link must be a storefront path starting with /"
      )
    }
    patch.link = link
  }
  if (body.starts_at !== undefined) {
    patch.starts_at = parseDate(body.starts_at)
  }
  if (body.ends_at !== undefined) {
    patch.ends_at = parseDate(body.ends_at)
  }
  if (body.is_published !== undefined) {
    patch.is_published = body.is_published === true
  }
  const [updated] = await ops.updateBanners([patch])
  res.status(200).json({ banner: updated })
}

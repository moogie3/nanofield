import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

type BannerRow = {
  id: string
  type: string
  title: string
  description?: string | null
  link?: string | null
  image_url?: string | null
  starts_at?: string | null
  ends_at?: string | null
  is_published?: boolean | null
}

type BannerOps = {
  listBanners: (filters?: Record<string, unknown>) => Promise<BannerRow[]>
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

// Public storefront feed: only live banners. Live = published AND now
// within [starts_at, ends_at] (null bounds mean open). Split by type so the
// storefront renders the announcement strip above the image banner.
// Never throws feed internals — empty arrays on any failure.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const now = new Date()
    const rows = await banners(req).listBanners({})
    const live = rows.filter((b) => {
      if (b.is_published === false) {
        return false
      }
      if (b.starts_at && new Date(b.starts_at) > now) {
        return false
      }
      if (b.ends_at && new Date(b.ends_at) < now) {
        return false
      }
      return true
    })
    res.status(200).json({
      announcements: live
        .filter((b) => b.type === "announcement")
        .map(toPayload),
      image: live.filter((b) => b.type === "image").map(toPayload),
    })
  } catch {
    res.status(200).json({ announcements: [], image: [] })
  }
}

const toPayload = (b: BannerRow) => ({
  id: b.id,
  title: b.title,
  description: b.description || "",
  link: b.link || "",
  // Heals rows persisted with Windows backslash separators (see admin POST).
  image_url: (b.image_url || "").replace(/\\/g, "/"),
  ends_at: b.ends_at || null,
})

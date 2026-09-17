import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"

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
  created_at?: string
}

type BannerOps = {
  listBanners: (filters?: Record<string, unknown>) => Promise<BannerRow[]>
  createBanners: (data: Record<string, unknown>) => Promise<BannerRow>
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

// Image uploads ride the file-local provider into <cwd>/static (same volume
// as product uploads). Only the relative path is persisted (/static/<key>)
// — the storefront prefixes its backend URL, so no localhost origin leaks
// into production rows the way the provider's absolute url would.
const storeBannerImage = async (
  req: MedusaRequest,
  file: { originalname: string; mimetype: string; buffer: Buffer }
): Promise<string> => {
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (!allowed.includes(file.mimetype)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "banner image must be JPEG, PNG, or WebP"
    )
  }
  if (file.buffer.length > 5 * 1024 * 1024) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "banner image must be under 5MB"
    )
  }
  const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")
  const resolve = req.scope.resolve as unknown as (key: string) => {
    createFiles: (data: Record<string, unknown>) => Promise<{ id: string }>
  }
  const fileModule = resolve(Modules.FILE)
  const created = await fileModule.createFiles({
    filename: `banners/${Date.now()}-${safe}`,
    mimeType: file.mimetype,
    content: file.buffer,
    access: "public",
  })
  // Forward slashes always: path.join on Windows emits backslashes, which
  // are fragile in URLs behind some proxies/CDNs.
  return `/static/${created.id.replace(/\\/g, "/")}`
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

// Newest first. Unpublished and expired rows included — history is kept,
// visibility is decided by the store route, not by deletion.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  let rows: BannerRow[]
  try {
    rows = await banners(req).listBanners({})
  } catch (e) {
    // Module registered but store failing = backend booted without running
    // migrations (code was added without a restart). Anything else is
    // surfaced verbatim so the admin page can name it.
    const cause = (e as Error)?.message || String(e)
    try {
      const logger = req.scope.resolve(
        ContainerRegistrationKeys.LOGGER
      ) as unknown as { error: (...args: unknown[]) => void }
      logger.error(`[banners] store unavailable: ${cause}`)
    } catch {
      // logger itself unreachable — the HTTP message below still carries it
    }
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      cause.includes("not loaded")
        ? "banner store is unavailable — restart the backend so migrations apply"
        : `banner store error: ${cause}`
    )
  }
  rows.sort((a, b) => ((a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1))
  res.status(200).json({ banners: rows.slice(0, 100).map(toPayload) })
}

// Creates an announcement (JSON) or image banner (multipart with `image`
// file). Announcements can double as bell broadcasts via the announcements
// page; this endpoint only manages the banner surface.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as Record<string, unknown>
  const type = String(body.type ?? "")
  if (type !== "announcement" && type !== "image") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'type must be "announcement" or "image"'
    )
  }
  const title = String(body.title ?? "").trim().slice(0, 120)
  if (!title) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "title is required")
  }
  const description = String(body.description ?? "").trim().slice(0, 500)
  const link = String(body.link ?? "").trim().slice(0, 200)
  if (link && !link.startsWith("/")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "link must be a storefront path starting with /"
    )
  }
  const startsAt = parseDate(body.starts_at)
  const endsAt = parseDate(body.ends_at)
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "ends_at must be after starts_at"
    )
  }

  let imageUrl: string | null = null
  if (type === "image") {
    const file = (req as unknown as { file?: {
      originalname: string
      mimetype: string
      buffer: Buffer
    } }).file
    if (!file) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "image banner requires an image file"
      )
    }
    imageUrl = await storeBannerImage(req, file)
  }

  const created = await banners(req).createBanners({
    type,
    title,
    ...(description ? { description } : {}),
    ...(link ? { link } : {}),
    ...(imageUrl ? { image_url: imageUrl } : {}),
    ...(startsAt ? { starts_at: startsAt } : {}),
    ...(endsAt ? { ends_at: endsAt } : {}),
    is_published: body.is_published !== false,
  })
  res.status(201).json({ banner: toPayload(created) })
}

const toPayload = (b: BannerRow) => ({
  id: b.id,
  type: b.type,
  title: b.title,
  description: b.description || "",
  link: b.link || "",
  image_url: b.image_url || "",
  starts_at: b.starts_at || null,
  ends_at: b.ends_at || null,
  is_published: b.is_published !== false,
  created_at: b.created_at,
})

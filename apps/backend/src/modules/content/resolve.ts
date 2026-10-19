import type { MedusaRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

export type SiteSettingRow = {
  id: string
  key: string
  locale: string
  value: string
}

export type ContentPageRow = {
  id: string
  slug: string
  locale: string
  title: string
  subtitle: string | null
  body: string
  data: Record<string, unknown> | null
  status: string
  seo_title: string | null
  seo_description: string | null
  created_at?: string | Date
  updated_at?: string | Date
}

export type ContentOps = {
  listSiteSettings: (
    filters?: Record<string, unknown>
  ) => Promise<SiteSettingRow[]>
  createSiteSettings: (
    data: Record<string, unknown>
  ) => Promise<SiteSettingRow>
  updateSiteSettings: (
    data: Record<string, unknown>
  ) => Promise<SiteSettingRow>
  deleteSiteSettings: (ids: string | string[]) => Promise<void>
  listContentPages: (
    filters?: Record<string, unknown>
  ) => Promise<ContentPageRow[]>
  createContentPages: (
    data: Record<string, unknown>
  ) => Promise<ContentPageRow>
  updateContentPages: (
    data: Record<string, unknown>
  ) => Promise<ContentPageRow>
  deleteContentPages: (ids: string | string[]) => Promise<void>
}

const CONTENT_KEYS_SVC = ["content", "contentModuleService"]

// Resolves the content module service through whichever alias the container
// exposes, so routes keep working across Medusa registration changes. Throws a
// clear error when the module itself is not loaded (backend booted before the
// module was registered / migrations were run).
export const resolveContent = (req: MedusaRequest): ContentOps => {
  const resolve = req.scope.resolve as unknown as (
    key: string
  ) => ContentOps | null
  for (const key of CONTENT_KEYS_SVC) {
    try {
      const svc = resolve(key)
      if (svc && typeof svc.listSiteSettings === "function") {
        return svc
      }
    } catch {
      // try the next key
    }
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "content module is not loaded"
  )
}

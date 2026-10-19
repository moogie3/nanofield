import type { ContentPageRow } from "./resolve"

const time = (value?: string | Date): number | null =>
  value ? new Date(value).getTime() : null

// Admin projection: includes status so the editor can show draft/published.
export const toAdminPage = (p: ContentPageRow) => ({
  id: p.id,
  slug: p.slug,
  locale: p.locale,
  title: p.title,
  subtitle: p.subtitle || "",
  body: p.body || "",
  data: p.data ?? null,
  status: p.status || "published",
  seo_title: p.seo_title || "",
  seo_description: p.seo_description || "",
  updated_at: time(p.updated_at),
})

// Public projection: no internal status/id; the store route already filters to
// published rows.
export const toStorePage = (p: ContentPageRow) => ({
  slug: p.slug,
  locale: p.locale,
  title: p.title,
  subtitle: p.subtitle || "",
  body: p.body || "",
  data: p.data ?? null,
  seo_title: p.seo_title || "",
  seo_description: p.seo_description || "",
  updated_at: time(p.updated_at),
})

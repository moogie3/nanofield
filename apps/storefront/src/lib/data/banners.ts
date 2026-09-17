"use server"

import { sdk } from "@lib/config"

export type StoreBanner = {
  id: string
  title: string
  description: string
  link: string
  image_url: string
  ends_at: string | null
}

// Public storefront banner feed (GET /store/banners, publishable key only —
// no login needed). Never throws: pages render with or without banners.
// Uncached on purpose: banner publish/unpublish must show on the very next
// visit, and the payload is a handful of rows.
export const listStoreBanners = async (): Promise<{
  announcements: StoreBanner[]
  image: StoreBanner[]
}> => {
  const empty = { announcements: [], image: [] }
  return await sdk.client
    .fetch<{ announcements?: StoreBanner[]; image?: StoreBanner[] }>(
      `/store/banners`,
      {
        method: "GET",
        cache: "no-store",
      }
    )
    .then(({ announcements, image }) => ({
      announcements: announcements ?? [],
      image: image ?? [],
    }))
    .catch(() => empty)
}

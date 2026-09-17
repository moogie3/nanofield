import { listStoreBanners } from "@lib/data/banners"
import AnnouncementStrip from "./announcement-strip"
import ImageBanner from "./image-banner"

// Live storefront banners for the homepage + store page: announcement
// strip(s) stacked above the image banner(s). Renders nothing when empty —
// callers place it unconditionally.
export default async function StoreBanners() {
  const { announcements, image } = await listStoreBanners().catch(() => ({
    announcements: [],
    image: [],
  }))

  if (!announcements.length && !image.length) {
    return null
  }

  // relative: paints above the absolute PageBackdrop grid (positioned
  // elements win over static siblings in the same stacking context).
  return (
    <div
      className="content-container relative flex flex-col gap-4 pt-6"
      data-testid="store-banners"
    >
      {announcements.map((b) => (
        <AnnouncementStrip key={b.id} banner={b} />
      ))}
      {image.map((b) => (
        <ImageBanner key={b.id} banner={b} />
      ))}
    </div>
  )
}

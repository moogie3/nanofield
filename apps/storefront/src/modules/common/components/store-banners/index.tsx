import { listStoreBanners } from "@lib/data/banners"
import ImageBannerCarousel from "./image-banner-carousel"

// Image banner carousel for the homepage + store page.
// Announcement strips have moved to the global layout (AnnouncementBanner)
// so they appear below the navbar on every page.
// Renders nothing when there are no live image banners.
export default async function StoreBanners() {
  const { image } = await listStoreBanners().catch(() => ({
    announcements: [],
    image: [],
  }))

  if (!image.length) {
    return null
  }

  return (
    <div
      className="content-container relative pt-6 pb-10"
      data-testid="store-banners"
    >
      <ImageBannerCarousel banners={image} />
    </div>
  )
}

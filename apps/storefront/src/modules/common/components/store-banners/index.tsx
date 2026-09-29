import { getTranslations } from "next-intl/server"
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

  const t = await getTranslations("common")

  return (
    <div
      className="content-container relative pt-6 pb-10"
      data-testid="store-banners"
    >
      <div className="mb-5 text-center">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          {t("spotlight")}
        </p>
        <h2 className="font-heading text-xl font-bold tracking-tight text-foreground small:text-2xl">
          {t("featured")}
        </h2>
      </div>
      <ImageBannerCarousel banners={image} />
    </div>
  )
}

import { listStoreBanners } from "@lib/data/banners"
import AnnouncementStrip from "@modules/common/components/store-banners/announcement-strip"

// Global announcement strips rendered below the navbar on every page.
// Fetches only the announcement-type banners; image banners are handled
// separately by the homepage carousel. Renders nothing when there are no
// live announcements so pages without banners are unaffected.
export default async function AnnouncementBanner() {
  const { announcements } = await listStoreBanners().catch(() => ({
    announcements: [],
    image: [],
  }))

  if (!announcements.length) {
    return null
  }

  return (
    <div className="content-container flex flex-col gap-2 pt-3 pb-1">
      {announcements.map((b) => (
        <AnnouncementStrip key={b.id} banner={b} />
      ))}
    </div>
  )
}

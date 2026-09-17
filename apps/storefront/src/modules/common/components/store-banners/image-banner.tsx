import type { StoreBanner } from "@lib/data/banners"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const backendUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

// Fixed image banner: never dismissible, visibility is fully
// backend-controlled (published + within dates). Image files live under the
// backend /static volume; the stored path is relative so no origin leaks.
export default function ImageBanner({ banner }: { banner: StoreBanner }) {
  if (!banner.image_url) {
    return null
  }
  // Plain img on purpose: Next image optimization is disabled
  // project-wide (unoptimized), same as the order QR codes.
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${backendUrl}${banner.image_url}`}
      alt={banner.title}
      loading="lazy"
      className="w-full rounded-2xl border border-border object-cover"
    />
  )
  return banner.link ? (
    <LocalizedClientLink
      href={banner.link}
      aria-label={banner.title}
      className="block transition-opacity hover:opacity-95"
    >
      {img}
    </LocalizedClientLink>
  ) : (
    img
  )
}

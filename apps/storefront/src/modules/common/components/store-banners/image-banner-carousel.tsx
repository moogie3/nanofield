"use client"

import { useState } from "react"
import type { StoreBanner } from "@lib/data/banners"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const backendUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

function resolveUrl(imageUrl: string): string {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl
  }
  return `${backendUrl}${imageUrl}`
}

export default function ImageBannerCarousel({
  banners,
}: {
  banners: StoreBanner[]
}) {
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)

  if (!banners.length) return null

  const banner = banners[index]
  if (!banner.image_url) return null

  const prev = () =>
    setIndex((i) => (i - 1 + banners.length) % banners.length)
  const next = () => setIndex((i) => (i + 1) % banners.length)

  // Fixed 3:1 aspect ratio container — every image is cropped/fitted to the
  // same box regardless of its source dimensions (portrait, square, landscape).
  // object-cover centres and fills; change the aspect class here to adjust
  // the banner height across the whole carousel (e.g. aspect-[16/5] is taller).
  const imgBox = (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border aspect-[3/1]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveUrl(banner.image_url)}
        alt={banner.title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  )

  const inner = banner.link ? (
    <LocalizedClientLink
      href={banner.link}
      aria-label={banner.title}
      className="block transition-opacity hover:opacity-95"
    >
      {imgBox}
    </LocalizedClientLink>
  ) : (
    imgBox
  )

  const btnBase =
    "absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity duration-200 focus:outline-none"

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {inner}

      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous banner"
            className={`${btnBase} left-3 ${hovered ? "opacity-100" : "opacity-0"}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="13 16 7 10 13 4" />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Next banner"
            className={`${btnBase} right-3 ${hovered ? "opacity-100" : "opacity-0"}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="7 4 13 10 7 16" />
            </svg>
          </button>

          {/* dot indicators */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === index
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

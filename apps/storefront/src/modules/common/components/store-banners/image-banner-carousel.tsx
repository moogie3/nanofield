"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
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
  const t = useTranslations("common")

  // Only banners with an image participate — the active slot must always
  // have something to show (previously an imageless active banner blanked
  // the whole carousel).
  const slides = banners.filter((b) => b.image_url)
  const count = slides.length

  // Auto-advance every 3s. The effect depends on `index`, so any slide
  // change (auto or manual) restarts the full 3s window. Paused while
  // hovered, with a single banner, or under prefers-reduced-motion.
  useEffect(() => {
    if (count < 2 || hovered) {
      return
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }
    const id = window.setInterval(() => {
      if (!document.hidden) {
        setIndex((i) => (i + 1) % count)
      }
    }, 3000)
    return () => window.clearInterval(id)
  }, [index, hovered, count])

  if (!count) return null

  const prev = () => setIndex((i) => (i - 1 + count) % count)
  const next = () => setIndex((i) => (i + 1) % count)

  // Sliding track: every slide sits side-by-side at full viewport width and
  // the track glides via translateX with a 700ms ease. translateX % refers
  // to the track's own border box — which is exactly one viewport wide
  // (w-full; slides overflow) — so each step is a plain -100%, no division.
  // Fixed 3:1 aspect ratio — every image is cropped/fitted to the same box
  // regardless of source dimensions; change the aspect class to adjust
  // banner height across the whole carousel (e.g. aspect-[16/5] is taller).
  const inner = (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border aspect-[3/1]">
      <div
        className="flex h-full w-full transition-transform duration-700 ease-in-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((b, i) => {
          const slideImg = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveUrl(b.image_url!)}
              alt={b.title}
              loading={i === 0 ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
          return (
            <div
              key={b.id}
              className="relative h-full w-full shrink-0"
              aria-hidden={i !== index}
              inert={i !== index}
            >
              {b.link ? (
                <LocalizedClientLink
                  href={b.link}
                  aria-label={b.title}
                  className="block h-full w-full transition-opacity hover:opacity-95"
                >
                  {slideImg}
                </LocalizedClientLink>
              ) : (
                slideImg
              )}
            </div>
          )
        })}
      </div>
    </div>
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

      {count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label={t("previousBanner")}
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
            aria-label={t("nextBanner")}
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
            {slides.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setIndex(i)}
                aria-label={t("bannerCount", {
                  current: i + 1,
                  total: count,
                })}
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

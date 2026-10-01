"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export default function StickyNav({
  children,
  banner,
}: {
  children: React.ReactNode
  banner?: React.ReactNode
}) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      <header
        className={cn(
          // No border-b: the constrained gradient hairline below already
          // marks the edge. A full-bleed border duplicates it on wide screens.
          "relative h-16 mx-auto duration-300",
          scrolled
            ? "bg-[color-mix(in_oklch,var(--background)_70%,transparent)] backdrop-blur-xl shadow-sm"
            : "bg-transparent",
        )}
      >
        {children}
        {/* Hairline shares the content-container box with the nav so it
            never bleeds full-bleed past the navbar content on wide screens. */}
        <div
          aria-hidden
          className="content-container pointer-events-none absolute inset-x-0 bottom-0"
        >
          <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      </header>
      {banner && (
        <div
          className={cn(
            "duration-300",
            scrolled
              ? "bg-[color-mix(in_oklch,var(--background)_85%,transparent)] backdrop-blur-xl"
              : "bg-transparent",
          )}
        >
          {banner}
        </div>
      )}
    </div>
  )
}

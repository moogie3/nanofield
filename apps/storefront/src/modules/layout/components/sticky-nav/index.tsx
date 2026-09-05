"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export default function StickyNav({ children }: { children: React.ReactNode }) {
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
          "relative h-16 mx-auto border-b duration-300",
          scrolled
            ? "bg-[color-mix(in_oklch,var(--background)_70%,transparent)] backdrop-blur-xl border-border shadow-sm"
            : "bg-transparent border-transparent",
        )}
      >
        {children}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        />
      </header>
    </div>
  )
}

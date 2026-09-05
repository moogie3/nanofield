"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import DefaultProductImage from "@modules/products/components/default-product-image"

const PANEL_WIDTH = 200
const PANEL_HEIGHT_ESTIMATE = 260
const CURSOR_OFFSET = 18
const VIEWPORT_MARGIN = 16

export default function HoverPreview({
  image,
  title,
  children,
}: {
  image?: string | null
  title: string
  children: React.ReactNode
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const raf = useRef<number | null>(null)

  const handleMove = (e: React.MouseEvent) => {
    if (raf.current) {
      return
    }
    const { clientX, clientY } = e
    raf.current = requestAnimationFrame(() => {
      raf.current = null
      setPos({ x: clientX, y: clientY })
    })
  }

  const handleLeave = () => {
    if (raf.current) {
      cancelAnimationFrame(raf.current)
      raf.current = null
    }
    setPos(null)
  }

  const flip =
    pos !== null &&
    typeof window !== "undefined" &&
    window.innerWidth - pos.x < PANEL_WIDTH + CURSOR_OFFSET + VIEWPORT_MARGIN

  // Clamp the floating panel inside the viewport so it never sits flush
  // against (or overflows past) the right / bottom edge.
  const panelLeft =
    pos === null || typeof window === "undefined"
      ? 0
      : Math.min(
          Math.max(
            VIEWPORT_MARGIN,
            flip
              ? pos.x - PANEL_WIDTH - CURSOR_OFFSET
              : pos.x + CURSOR_OFFSET
          ),
          window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN
        )
  const panelTop =
    pos === null || typeof window === "undefined"
      ? 0
      : Math.min(
          Math.max(VIEWPORT_MARGIN, pos.y - 60),
          Math.max(
            VIEWPORT_MARGIN,
            window.innerHeight - PANEL_HEIGHT_ESTIMATE - VIEWPORT_MARGIN
          )
        )

  return (
    <>
      <div
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="h-full"
      >
        {children}
      </div>
      {pos && (
        <div
          className="bg-blueprint-tile animate-hero-pop pointer-events-none fixed z-[60] hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xl small:block"
          style={{
            width: PANEL_WIDTH,
            left: panelLeft,
            top: panelTop,
          }}
        >
          <div className="relative aspect-square w-full">
            {image ? (
              <Image
                src={image}
                alt={title}
                fill
                sizes="200px"
                className="object-cover object-center"
                draggable={false}
              />
            ) : (
              <DefaultProductImage size="sm" />
            )}
          </div>
        </div>
      )}
    </>
  )
}

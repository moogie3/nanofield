"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import PlaceholderImage from "@modules/common/icons/placeholder-image"

const PANEL_WIDTH = 320
const CURSOR_OFFSET = 18

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
    window.innerWidth - pos.x < PANEL_WIDTH + CURSOR_OFFSET + 8

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
          className="pointer-events-none fixed z-[60] overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          style={{
            width: PANEL_WIDTH,
            left: flip
              ? pos.x - PANEL_WIDTH - CURSOR_OFFSET
              : pos.x + CURSOR_OFFSET,
            top: Math.max(8, pos.y - 80),
          }}
        >
          <div className="relative aspect-square w-full bg-ui-bg-subtle">
            {image ? (
              <Image
                src={image}
                alt={title}
                fill
                sizes="320px"
                className="object-cover object-center"
                draggable={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <PlaceholderImage size={24} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

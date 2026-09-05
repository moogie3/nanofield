"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

const STATS = ["900+ parts in stock", "34 categories", "Datasheet-backed"]

const symbolProps = {
  viewBox: "0 0 64 64",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const

const ResistorSymbol = () => (
  <svg {...symbolProps}>
    <path d="M4 32 H16 L22 20 L30 44 L38 20 L46 44 L52 32 H60" />
  </svg>
)

const CapacitorSymbol = () => (
  <svg {...symbolProps}>
    <path d="M4 32 H28 M36 32 H60 M30 18 V46 M34 18 V46" />
  </svg>
)

const DiodeSymbol = () => (
  <svg {...symbolProps}>
    <path d="M4 32 H18 M46 32 H60 M18 20 V44 L40 32 Z M46 20 V44" />
  </svg>
)

const TransistorSymbol = () => (
  <svg {...symbolProps}>
    <circle cx="34" cy="34" r="14" />
    <path d="M6 34 H20 M16 12 L28 24 M16 54 L26 44 M26 44 l-7 1 M26 44 l1 -7" />
  </svg>
)

const ChipSymbol = () => (
  <svg {...symbolProps}>
    <rect x="20" y="12" width="24" height="40" rx="2" />
    <circle cx="32" cy="19" r="2" fill="currentColor" stroke="none" />
    <path d="M10 22 H20 M10 30 H20 M10 38 H20 M10 46 H20 M44 22 H54 M44 30 H54 M44 38 H54 M44 46 H54" />
  </svg>
)

const TraceSymbol = () => (
  <svg {...symbolProps}>
    <path d="M4 48 H22 L34 36 H52" />
    <circle cx="4" cy="48" r="3" fill="currentColor" stroke="none" />
    <circle cx="52" cy="36" r="3" fill="currentColor" stroke="none" />
    <path d="M22 48 V60 H32" />
    <circle cx="32" cy="60" r="3" fill="currentColor" stroke="none" />
  </svg>
)

const LedSymbol = () => (
  <svg {...symbolProps}>
    <path d="M6 40 H20 M36 40 H50 M20 28 V52 L36 40 Z M40 28 V52 M44 20 l8 -8 M50 26 l8 -8" />
  </svg>
)

const InductorSymbol = () => (
  <svg {...symbolProps}>
    <path d="M4 32 H14 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 H60" />
  </svg>
)

const MosfetSymbol = () => (
  <svg {...symbolProps}>
    <path d="M6 32 H22 M22 20 V44 M32 12 V52 M32 12 V6 M32 52 V58 M27 45 L32 39 L37 45" />
  </svg>
)

const IgbtSymbol = () => (
  <svg {...symbolProps}>
    <path d="M6 32 H22 M22 18 V46 M32 14 V50 M32 14 V6 M32 50 V58 M26 12 L32 18 L38 12 M25 54 L32 58 L39 54" />
  </svg>
)

const PotentiometerSymbol = () => (
  <svg {...symbolProps}>
    <path d="M4 40 H16 L22 28 L30 52 L38 28 L46 52 L52 40 H60 M40 12 L24 50 M24 50 l11 -2 M24 50 l2 -11" />
  </svg>
)

const CrystalSymbol = () => (
  <svg {...symbolProps}>
    <rect x="22" y="24" width="20" height="16" />
    <path d="M6 32 H22 M42 32 H58" />
  </svg>
)

const OpAmpSymbol = () => (
  <svg {...symbolProps}>
    <path d="M14 20 L48 32 L14 44 Z M6 25 H14 M6 39 H14 M48 32 H58 M20 30 h6" />
  </svg>
)

const TransformerSymbol = () => (
  <svg {...symbolProps}>
    <circle cx="25" cy="32" r="9" />
    <circle cx="39" cy="32" r="9" />
    <path d="M6 32 H16 M48 32 H58" />
  </svg>
)

const FuseSymbol = () => (
  <svg {...symbolProps}>
    <rect x="24" y="28" width="16" height="8" />
    <path d="M6 32 H24 M40 32 H58 M28 32 H36" />
  </svg>
)

const GroundSymbol = () => (
  <svg {...symbolProps}>
    <path d="M32 10 V38 M20 38 H44 M25 44 H39 M28.5 50 H35.5" />
  </svg>
)

const AntennaSymbol = () => (
  <svg {...symbolProps}>
    <path d="M32 58 V30 M22 24 a14 14 0 0 1 20 0 M26.5 28.5 a8 8 0 0 1 11 0" />
    <circle cx="32" cy="32" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)

const PinHeaderSymbol = () => (
  <svg {...symbolProps}>
    <path d="M10 34 H54 V42 H10 Z M16 34 V16 M26 34 V16 M36 34 V16 M46 34 V16 M16 42 V50 M26 42 V50 M36 42 V50 M46 42 V50" />
  </svg>
)

const SYMBOLS: {
  El: () => React.JSX.Element
  className: string
}[] = [
  { El: ResistorSymbol, className: "left-[2%] top-[10%] h-6 w-6" },
  { El: MosfetSymbol, className: "left-[12%] top-[6%] h-7 w-7" },
  { El: CapacitorSymbol, className: "left-[22%] top-[10%] h-5 w-5" },
  { El: TraceSymbol, className: "left-[33%] top-[6%] hidden h-6 w-6 small:block" },
  { El: IgbtSymbol, className: "left-[44%] top-[10%] hidden h-6 w-6 small:block" },
  { El: DiodeSymbol, className: "left-[55%] top-[6%] h-6 w-6" },
  { El: CrystalSymbol, className: "left-[66%] top-[10%] hidden h-5 w-5 small:block" },
  { El: ChipSymbol, className: "left-[76%] top-[6%] h-7 w-7" },
  { El: PotentiometerSymbol, className: "right-[3%] top-[11%] h-7 w-7" },
  { El: LedSymbol, className: "left-[5%] top-[34%] hidden h-6 w-6 small:block" },
  { El: InductorSymbol, className: "left-[16%] top-[40%] h-5 w-8" },
  {
    El: TransistorSymbol,
    className: "left-[30%] top-[36%] h-6 w-6 rotate-12",
  },
  { El: MosfetSymbol, className: "left-[42%] top-[42%] hidden h-5 w-5 -rotate-12 small:block" },
  { El: LedSymbol, className: "left-[55%] top-[36%] hidden h-5 w-5 small:block" },
  { El: CapacitorSymbol, className: "left-[68%] top-[42%] h-5 w-5 rotate-12" },
  { El: ResistorSymbol, className: "right-[16%] top-[38%] hidden h-6 w-6 small:block" },
  { El: TraceSymbol, className: "right-[4%] top-[36%] hidden h-6 w-6 small:block" },
  { El: ChipSymbol, className: "bottom-[24%] left-[3%] hidden h-6 w-6 small:block" },
  { El: CrystalSymbol, className: "bottom-[14%] left-[13%] h-5 w-5" },
  { El: DiodeSymbol, className: "bottom-[10%] left-[26%] h-5 w-5 rotate-12" },
  { El: PotentiometerSymbol, className: "bottom-[14%] left-[38%] hidden h-6 w-6 small:block" },
  { El: InductorSymbol, className: "bottom-[10%] left-[52%] hidden h-5 w-8 small:block" },
  {
    El: IgbtSymbol,
    className: "bottom-[12%] left-[64%] hidden h-6 w-6 -rotate-12 small:block",
  },
  { El: MosfetSymbol, className: "bottom-[22%] right-[14%] hidden h-6 w-6 small:block" },
  { El: LedSymbol, className: "bottom-[12%] right-[5%] hidden h-6 w-6 small:block" },
  { El: CapacitorSymbol, className: "bottom-[8%] right-[28%] h-5 w-5" },
  { El: OpAmpSymbol, className: "left-[7%] top-[25%] hidden h-6 w-6 small:block" },
  { El: GroundSymbol, className: "left-[17%] bottom-[30%] hidden h-6 w-6 small:block" },
  { El: PinHeaderSymbol, className: "left-[47%] bottom-[4%] hidden h-6 w-8 small:block" },
  { El: FuseSymbol, className: "left-[52%] top-[4%] hidden h-5 w-7 small:block" },
  { El: TransformerSymbol, className: "right-[11%] top-[24%] hidden h-6 w-8 small:block" },
  { El: AntennaSymbol, className: "right-[6%] top-[54%] hidden h-6 w-6 small:block" },
  { El: OpAmpSymbol, className: "right-[30%] bottom-[6%] h-5 w-5" },
  { El: FuseSymbol, className: "right-[24%] top-[52%] hidden h-5 w-7 small:block" },
]

const DRAG_STORE_KEY = "nanofield-hero-symbols-v1"

type DragStore = Record<string, { x: number; y: number }>

const loadDragStore = (): DragStore => {
  try {
    const raw = localStorage.getItem(DRAG_STORE_KEY)
    return raw ? (JSON.parse(raw) as DragStore) : {}
  } catch {
    return {}
  }
}

const saveDragOffset = (id: string, offset: { x: number; y: number }) => {
  try {
    const store = loadDragStore()
    store[id] = offset
    localStorage.setItem(DRAG_STORE_KEY, JSON.stringify(store))
  } catch {
    // persistence is best-effort (private mode, quota)
  }
}

const clearDragOffset = (id: string) => {
  try {
    const store = loadDragStore()
    delete store[id]
    localStorage.setItem(DRAG_STORE_KEY, JSON.stringify(store))
  } catch {
    // persistence is best-effort (private mode, quota)
  }
}

const DraggableSymbol = ({
  id,
  index,
  className,
  children,
}: {
  id: string
  index: number
  className: string
  children: React.ReactNode
}) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{
    startX: number
    startY: number
    baseX: number
    baseY: number
  } | null>(null)
  const offset = useRef({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const saved = loadDragStore()[id]
    if (saved && ref.current) {
      offset.current = saved
      ref.current.style.transform = `translate(${saved.x}px, ${saved.y}px)`
    }
  }, [id])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.current.x,
      baseY: offset.current.y,
    }
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || !ref.current) {
      return
    }
    const x = d.baseX + e.clientX - d.startX
    const y = d.baseY + e.clientY - d.startY
    offset.current = { x, y }
    ref.current.style.transform = `translate(${x}px, ${y}px)`
  }

  const endDrag = () => {
    if (!drag.current) {
      return
    }
    drag.current = null
    setDragging(false)
    saveDragOffset(id, offset.current)
  }

  const resetPosition = () => {
    offset.current = { x: 0, y: 0 }
    if (ref.current) {
      ref.current.style.transform = "translate(0px, 0px)"
    }
    clearDragOffset(id)
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={resetPosition}
      title="Drag to move · double-click to reset"
      className={`absolute touch-none pointer-events-auto before:absolute before:-inset-3 before:content-[""] ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      } ${className}`}
    >
      <div
        className="animate-hero-drift"
        style={{
          animationDelay: `${-(index * 0.7)}s`,
          animationDuration: `${7 + (index % 4)}s`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

const Hero = () => {
  const sectionRef = useRef<HTMLElement | null>(null)
  const glowRef = useRef<HTMLDivElement | null>(null)
  const coordRef = useRef<HTMLSpanElement | null>(null)
  const reducedMotion = useRef(false)
  const [inside, setInside] = useState(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  }, [])

  const handleMove = (e: React.MouseEvent) => {
    if (reducedMotion.current) {
      return
    }
    const el = sectionRef.current
    if (!el) {
      return
    }
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(150px circle at ${x}px ${y}px, color-mix(in oklch, var(--primary) 24%, transparent), transparent 70%)`
    }
    if (coordRef.current) {
      coordRef.current.textContent = `X ${String(Math.round(x)).padStart(
        4,
        "0"
      )} · Y ${String(Math.round(y)).padStart(4, "0")}`
    }
  }

  const handleEnter = () => {
    setInside(true)
  }

  const handleLeave = () => {
    setInside(false)
  }

  return (
    <section
      ref={(node) => {
        sectionRef.current = node
      }}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative flex w-full min-h-[calc(100svh-4rem)] cursor-crosshair flex-col justify-center overflow-hidden border-b border-border bg-background"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(ellipse 75% 90% at 50% 40%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 90% at 50% 40%, black 30%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 text-muted-foreground opacity-[0.14] dark:text-white dark:opacity-30"
      >
        {SYMBOLS.map(({ El, className }, i) => (
          <DraggableSymbol
            key={i}
            id={`hero-symbol-${i}`}
            index={i}
            className={className}
          >
            <El />
          </DraggableSymbol>
        ))}
      </div>
      <div
        aria-hidden
        className="animate-hero-sweep pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div
        ref={glowRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          inside ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="content-container relative flex flex-col items-center gap-6 py-20 text-center small:py-28">
        <p
          className="animate-hero-rise inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur"
          style={{ animationDelay: "0ms" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Open for orders — 900+ parts in stock
        </p>
        <h1
          className="animate-hero-rise font-heading text-5xl font-bold tracking-tight text-foreground small:text-7xl"
          style={{ animationDelay: "90ms" }}
        >
          NANO<span className="text-primary">FIELD</span>
        </h1>
        <p
          className="animate-hero-rise text-base-regular max-w-2xl text-ui-fg-subtle small:text-large-regular"
          style={{ animationDelay: "180ms" }}
        >
          Precision Electronic Components &amp; Appliance Spare Parts. Search
          by IC part number, browse datasheets, and check real-time B2B/B2C
          stock.
        </p>
        <div
          className="animate-hero-rise flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: "270ms" }}
        >
          <Button
            asChild
            size="lg"
            className="font-bold uppercase tracking-widest"
          >
            <a href="/store">Enter Catalog</a>
          </Button>
        </div>
        <dl
          className="animate-hero-rise mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          style={{ animationDelay: "360ms" }}
        >
          {STATS.map((stat, i) => (
            <div key={stat} className="flex items-center gap-6">
              {i > 0 && (
                <span aria-hidden className="text-border">
                  /
                </span>
              )}
              <dd className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {stat}
              </dd>
            </div>
          ))}
        </dl>
        <p
          className={`mt-4 hidden font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-opacity duration-500 small:block ${
            inside ? "opacity-100" : "opacity-0"
          }`}
        >
          <span ref={coordRef}>X 0000 · Y 0000</span>
        </p>
      </div>
    </section>
  )
}

export default Hero

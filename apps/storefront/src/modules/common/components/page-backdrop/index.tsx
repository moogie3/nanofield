// Shared page background: tiling squares grid, with an optional floating
// swarm of schematic symbols (same look as the home hero: `animate-hero-drift`).
// Existing callers render the grid only — pass `swarm` to add the symbols.
const SWARM_SYMBOLS: {
  path: React.ReactNode
  className: string
  delay: string
  duration: string
}[] = [
  {
    // resistor — zigzag
    path: <polyline points="2,12 6,12 8,5 12,19 16,5 18,12 22,12" />,
    className: "left-[6%] top-[12%] h-6 w-6",
    delay: "0s",
    duration: "8s",
  },
  {
    // capacitor — parallel plates
    path: (
      <>
        <line x1="4" y1="12" x2="10" y2="12" />
        <line x1="10" y1="5" x2="10" y2="19" />
        <line x1="14" y1="5" x2="14" y2="19" />
        <line x1="14" y1="12" x2="20" y2="12" />
      </>
    ),
    className: "right-[8%] top-[10%] h-6 w-6",
    delay: "-2s",
    duration: "9s",
  },
  {
    // diode — triangle + bar
    path: (
      <>
        <line x1="2" y1="12" x2="7" y2="12" />
        <polygon points="7,6 17,12 7,18" />
        <line x1="17" y1="6" x2="17" y2="18" />
        <line x1="17" y1="12" x2="22" y2="12" />
      </>
    ),
    className: "left-[12%] top-[38%] h-6 w-6",
    delay: "-4s",
    duration: "10s",
  },
  {
    // chip — square + pins
    path: (
      <>
        <rect x="7" y="7" width="10" height="10" rx="1" />
        <line x1="10" y1="4" x2="10" y2="7" />
        <line x1="14" y1="4" x2="14" y2="7" />
        <line x1="10" y1="17" x2="10" y2="20" />
        <line x1="14" y1="17" x2="14" y2="20" />
        <line x1="4" y1="10" x2="7" y2="10" />
        <line x1="4" y1="14" x2="7" y2="14" />
        <line x1="17" y1="10" x2="20" y2="10" />
        <line x1="17" y1="14" x2="20" y2="14" />
      </>
    ),
    className: "right-[12%] top-[36%] h-7 w-7",
    delay: "-1s",
    duration: "7s",
  },
  {
    // inductor — loops
    path: (
      <>
        <line x1="2" y1="12" x2="5" y2="12" />
        <path d="M5 12a2.5 2.5 0 0 1 5 0a2.5 2.5 0 0 1 5 0a2.5 2.5 0 0 1 5 0" />
        <line x1="20" y1="12" x2="22" y2="12" />
      </>
    ),
    className: "left-[8%] bottom-[16%] h-5 w-8",
    delay: "-5s",
    duration: "9s",
  },
  {
    // led — diode + rays
    path: (
      <>
        <line x1="2" y1="14" x2="7" y2="14" />
        <polygon points="7,9 15,14 7,19" />
        <line x1="15" y1="9" x2="15" y2="19" />
        <line x1="15" y1="14" x2="19" y2="14" />
        <line x1="17" y1="4" x2="20" y2="7" />
        <line x1="20" y1="2" x2="20" y2="6" />
      </>
    ),
    className: "right-[10%] bottom-[14%] h-6 w-6",
    delay: "-3s",
    duration: "8s",
  },
  {
    // ground
    path: (
      <>
        <line x1="12" y1="3" x2="12" y2="12" />
        <line x1="5" y1="12" x2="19" y2="12" />
        <line x1="7.5" y1="16" x2="16.5" y2="16" />
        <line x1="10" y1="20" x2="14" y2="20" />
      </>
    ),
    className: "left-[45%] top-[7%] h-6 w-6",
    delay: "-6s",
    duration: "10s",
  },
  {
    // crystal
    path: (
      <>
        <rect x="7" y="7" width="10" height="10" rx="1" />
        <line x1="12" y1="3" x2="12" y2="7" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
    className: "right-[42%] bottom-[8%] h-5 w-5",
    delay: "-2.5s",
    duration: "7s",
  },
]

export default function PageBackdrop({
  className,
  swarm = false,
}: {
  className?: string
  swarm?: boolean
}) {
  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 opacity-[0.3] dark:opacity-35 ${
          className ?? ""
        }`}
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse 90% 85% at 50% 45%, black 35%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 85% at 50% 45%, black 35%, transparent 100%)",
        }}
      />
      {swarm && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden text-muted-foreground opacity-40 dark:opacity-50"
        >
          {SWARM_SYMBOLS.map((symbol, i) => (
            <div key={i} className={`absolute ${symbol.className}`}>
              <div
                className="animate-hero-drift h-full w-full"
                style={{
                  animationDelay: symbol.delay,
                  animationDuration: symbol.duration,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-full w-full"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {symbol.path}
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

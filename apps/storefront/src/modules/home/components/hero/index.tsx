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
  spin?: boolean
}[] = [
  { El: ResistorSymbol, className: "left-[2%] top-[10%] h-6 w-6" },
  { El: MosfetSymbol, className: "left-[12%] top-[6%] h-7 w-7", spin: true },
  { El: CapacitorSymbol, className: "left-[22%] top-[10%] h-5 w-5" },
  { El: TraceSymbol, className: "left-[33%] top-[6%] hidden h-6 w-6 small:block" },
  { El: IgbtSymbol, className: "left-[44%] top-[10%] hidden h-6 w-6 small:block", spin: true },
  { El: DiodeSymbol, className: "left-[55%] top-[6%] h-6 w-6" },
  { El: CrystalSymbol, className: "left-[66%] top-[10%] hidden h-5 w-5 small:block", spin: true },
  { El: ChipSymbol, className: "left-[76%] top-[6%] h-7 w-7" },
  { El: PotentiometerSymbol, className: "right-[3%] top-[11%] h-7 w-7" },
  { El: LedSymbol, className: "left-[5%] top-[34%] hidden h-6 w-6 small:block", spin: true },
  { El: InductorSymbol, className: "left-[16%] top-[40%] h-5 w-8" },
  {
    El: TransistorSymbol,
    className: "left-[30%] top-[36%] h-6 w-6 rotate-12",
    spin: true,
  },
  { El: MosfetSymbol, className: "left-[42%] top-[42%] hidden h-5 w-5 -rotate-12 small:block" },
  { El: LedSymbol, className: "left-[55%] top-[36%] hidden h-5 w-5 small:block", spin: true },
  { El: CapacitorSymbol, className: "left-[68%] top-[42%] h-5 w-5 rotate-12" },
  { El: ResistorSymbol, className: "right-[16%] top-[38%] hidden h-6 w-6 small:block", spin: true },
  { El: TraceSymbol, className: "right-[4%] top-[36%] hidden h-6 w-6 small:block" },
  { El: ChipSymbol, className: "bottom-[24%] left-[3%] hidden h-6 w-6 small:block", spin: true },
  { El: CrystalSymbol, className: "bottom-[14%] left-[13%] h-5 w-5" },
  { El: DiodeSymbol, className: "bottom-[10%] left-[26%] h-5 w-5 rotate-12", spin: true },
  { El: PotentiometerSymbol, className: "bottom-[14%] left-[38%] hidden h-6 w-6 small:block" },
  { El: InductorSymbol, className: "bottom-[10%] left-[52%] hidden h-5 w-8 small:block", spin: true },
  {
    El: IgbtSymbol,
    className: "bottom-[12%] left-[64%] hidden h-6 w-6 -rotate-12 small:block",
  },
  { El: MosfetSymbol, className: "bottom-[22%] right-[14%] hidden h-6 w-6 small:block", spin: true },
  { El: LedSymbol, className: "bottom-[12%] right-[5%] hidden h-6 w-6 small:block" },
  { El: CapacitorSymbol, className: "bottom-[8%] right-[28%] h-5 w-5", spin: true },
  { El: OpAmpSymbol, className: "left-[7%] top-[25%] hidden h-6 w-6 small:block" },
  { El: GroundSymbol, className: "left-[17%] bottom-[30%] hidden h-6 w-6 small:block", spin: true },
  { El: PinHeaderSymbol, className: "left-[47%] bottom-[4%] hidden h-6 w-8 small:block" },
  { El: FuseSymbol, className: "left-[52%] top-[4%] hidden h-5 w-7 small:block", spin: true },
  { El: TransformerSymbol, className: "right-[11%] top-[24%] hidden h-6 w-8 small:block" },
  { El: AntennaSymbol, className: "right-[6%] top-[54%] hidden h-6 w-6 small:block", spin: true },
  { El: OpAmpSymbol, className: "right-[30%] bottom-[6%] h-5 w-5" },
  { El: FuseSymbol, className: "right-[24%] top-[52%] hidden h-5 w-7 small:block", spin: true },
]

// ---------------------------------------------------------------------------
// HeroSchematic — one unified schematic scene filling the 1440×700 canvas.
//
// Layout (absolute SVG coords):
//   PWR block    top-left    ~(60,60)
//   MCU block    centre      ~(540,220) — large IC, 10 pins/side
//   ADC block    top-right   ~(1050,80)
//   MOTOR block  bot-right   ~(1100,430)
//   COMMS block  bot-left    ~(140,440)
//   Passive net  mid-canvas  connecting all blocks
//
// All nets are horizontal or vertical; junction dots mark T-junctions.
// Semiconductor symbols (diode, LED, MOSFET, transistor, relay) sit inline.
// ---------------------------------------------------------------------------

// ── Inline component helpers ──

// Capacitor inline on horizontal trace (centred at 0,0, horizontal)
const InlineCap = () => (
  <g>
    <path className="hero-tr" d="M-12 0 H-4 M4 0 H12 M-4 -7 V7 M4 -7 V7" />
  </g>
)

// Resistor inline on horizontal trace
const InlineRes = () => (
  <g>
    <path className="hero-tr" d="M-14 0 H-10 L-8 -5 L-4 5 L0 -5 L4 5 L8 -5 L10 0 H14" />
  </g>
)

// Inductor inline on horizontal trace
const InlineInd = () => (
  <g>
    <path className="hero-tr" d="M-14 0 H-10 a4 4 0 0 0 8 0 a4 4 0 0 0 8 0 a4 4 0 0 0 6 0 H14" />
  </g>
)

// Diode inline on horizontal trace (anode left)
const InlineDiode = () => (
  <g>
    <path className="hero-tr" d="M-12 0 H-6 M6 0 H12 M-6 -7 V7 L6 0 Z M6 -7 V7" />
  </g>
)

// Zener diode
const InlineZener = () => (
  <g>
    <path className="hero-tr" d="M-12 0 H-6 M6 0 H12 M-6 -7 V7 L6 0 Z M3 -7 H9 M3 7 H9" />
  </g>
)

// LED (diode + rays)
const InlineLed = () => (
  <g>
    <path className="hero-tr" d="M-12 0 H-6 M6 0 H12 M-6 -7 V7 L6 0 Z M6 -7 V7" />
    <path className="hero-tr" d="M2 -9 L8 -16 M6 -6 L12 -13" />
  </g>
)

// MOSFET-N (gate left, drain top, source bottom — rotated for horizontal net)
const InlineMosfet = () => (
  <g>
    <path className="hero-tr" d="M-12 0 H-4 M-4 -8 V8 M2 -6 V-2 M2 6 V2 M2 -2 H8 V-8 M2 2 H8 V8" />
    <path className="hero-tr" d="M8 -8 V-14 M8 8 V14" />
  </g>
)

// NPN transistor (base left)
const InlineNpn = () => (
  <g>
    <path className="hero-tr" d="M-12 0 H-4 M-4 -9 V9 M-4 -2 L4 -8 M-4 2 L4 8" />
    <path className="hero-tr" d="M4 -8 V-14 M4 8 l2 4 M4 8 l4 -2" />
  </g>
)

// Relay coil (vertical orientation)
const InlineRelay = () => (
  <g>
    <rect className="hero-tr" x="-10" y="-14" width="20" height="28" rx="2" />
    <path className="hero-tr" d="M-7 -6 a3.5 3.5 0 0 1 7 0 a3.5 3.5 0 0 1 7 0" />
    <path className="hero-tr" d="M0 14 V22 M0 -14 V-22" />
  </g>
)

// Switch SPST
const InlineSwitch = () => (
  <g>
    <circle className="hero-via" cx="-10" cy="0" r="2.5" />
    <path className="hero-tr" d="M-20 0 H-10 M-10 0 L8 -9" />
    <circle className="hero-via" cx="10" cy="0" r="2.5" />
    <path className="hero-tr" d="M10 0 H20" />
  </g>
)

// ── IC block helper: rect + evenly-spaced pins on all sides ──
const IcBlock = ({
  x, y, w, h,
  pinsTop = 0, pinsBottom = 0, pinsLeft = 0, pinsRight = 0,
  pinLen = 18,
}: {
  x: number; y: number; w: number; h: number
  pinsTop?: number; pinsBottom?: number; pinsLeft?: number; pinsRight?: number
  pinLen?: number
}) => {
  const spacing = (count: number, size: number) =>
    Array.from({ length: count }, (_, i) => {
      const step = size / (count + 1)
      return (i + 1) * step
    })

  return (
    <g>
      <rect className="hero-tr" x={x} y={y} width={w} height={h} rx="3" />
      {/* top */}
      {spacing(pinsTop, w).map((s, i) => (
        <path key={`pt${i}`} className="hero-tr" d={`M${x + s} ${y} V${y - pinLen}`} />
      ))}
      {/* bottom */}
      {spacing(pinsBottom, w).map((s, i) => (
        <path key={`pb${i}`} className="hero-tr" d={`M${x + s} ${y + h} V${y + h + pinLen}`} />
      ))}
      {/* left */}
      {spacing(pinsLeft, h).map((s, i) => (
        <path key={`pl${i}`} className="hero-tr" d={`M${x} ${y + s} H${x - pinLen}`} />
      ))}
      {/* right */}
      {spacing(pinsRight, h).map((s, i) => (
        <path key={`pr${i}`} className="hero-tr" d={`M${x + w} ${y + s} H${x + w + pinLen}`} />
      ))}
    </g>
  )
}

const HeroSchematic = () => (
  <g>

    {/* ════════════════════════════════════════════════════════
        POWER MANAGEMENT BLOCK  (top-left, ~60,50)
        ════════════════════════════════════════════════════════ */}

    {/* VIN connector */}
    <path className="hero-tr" d="M20 80 H60" />
    <rect className="hero-tr" x="60" y="60" width="36" height="40" rx="2" />
    <path className="hero-tr" d="M62 72 H84 M62 80 H84 M62 88 H84" />

    {/* VIN → fuse → diode → regulator */}
    <path className="hero-tr" d="M96 80 H118" />
    {/* fuse */}
    <rect className="hero-tr" x="118" y="72" width="22" height="16" rx="2" />
    <path className="hero-tr" d="M122 80 H136" />
    <path className="hero-tr" d="M140 80 H162" />
    {/* schottky diode */}
    <g transform="translate(174,80)"><InlineDiode /></g>
    <path className="hero-tr" d="M186 80 H210" />

    {/* LDO regulator IC */}
    <IcBlock x={210} y={58} w={60} h={46} pinsLeft={2} pinsRight={2} pinsTop={1} pinsBottom={1} pinLen={16} />
    {/* decoupling cap on VIN */}
    <path className="hero-tr" d="M228 58 V42" />
    <g transform="translate(228,36) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M228 30 V18 H260 V8" />
    <circle className="hero-via" cx="228" cy="42" r="3" />
    {/* GND symbols */}
    <path className="hero-tr" d="M228 104 V116 M216 116 H240 M219 121 H237 M222 126 H234" />

    {/* VOUT → power rail bus line at y=38 */}
    <path className="hero-tr" d="M270 80 H310 V38 H700" />
    <circle className="hero-via" cx="310" cy="80" r="3" />
    {/* cap on VOUT */}
    <path className="hero-tr" d="M310 80 V98" />
    <g transform="translate(310,104) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M310 116 V128 M298 128 H322 M301 133 H319 M304 138 H316" />

    {/* ─ Zener clamp from rail ─ */}
    <path className="hero-tr" d="M400 38 V58" />
    <g transform="translate(400,68) rotate(90)"><InlineZener /></g>
    <path className="hero-tr" d="M400 80 V92 M388 92 H412 M391 97 H409 M394 102 H406" />
    <circle className="hero-via" cx="400" cy="38" r="3" />

    {/* ─ LED power indicator ─ */}
    <path className="hero-tr" d="M470 38 V56" />
    <g transform="translate(470,68) rotate(90)"><InlineLed /></g>
    <path className="hero-tr" d="M470 80 H490 V92 M478 92 H502 M481 97 H499 M484 102 H496" />
    <circle className="hero-via" cx="470" cy="38" r="3" />

    {/* ════════════════════════════════════════════════════════
        MCU BLOCK  (centre, 530,160 — 200×260)
        ════════════════════════════════════════════════════════ */}

    <IcBlock x={530} y={160} w={200} h={260}
      pinsTop={7} pinsBottom={7} pinsLeft={9} pinsRight={9} pinLen={22} />

    {/* pin-1 marker */}
    <circle className="hero-via" cx="530" cy="160" r="4" />

    {/* decoupling caps on VCC pins (top) */}
    {[566, 594, 622, 650, 678, 706].map((px, i) => (
      <g key={`mcu-dc${i}`}>
        <path className="hero-tr" d={`M${px} 160 V142`} />
        <g transform={`translate(${px},134) rotate(90)`}><InlineCap /></g>
        <path className="hero-tr" d={`M${px} 126 V116`} />
        <circle className="hero-via" cx={px} cy="116" r="3" />
        <path className="hero-tr" d={`M${px} 116 V${100 - (i % 2) * 10}`} />
      </g>
    ))}

    {/* VBUS rail connection at y=38 → MCU top-left */}
    <path className="hero-tr" d="M700 38 H730 V116" />
    <circle className="hero-via" cx="700" cy="38" r="3" />
    {/* GND rail at y=490 → MCU bottom-left */}
    <path className="hero-tr" d="M566 420 V450 H300 V490" />
    <path className="hero-tr" d="M288 490 H312 M291 495 H309 M294 500 H306" />
    <circle className="hero-via" cx="566" cy="420" r="3" />

    {/* MCU left pins → COMMS block (traced below) */}
    {/* MCU right pins → ADC / MOTOR (traced below) */}

    {/* ════════════════════════════════════════════════════════
        ADC / SENSOR BLOCK  (top-right, 920,80 — 130×100)
        ════════════════════════════════════════════════════════ */}

    <IcBlock x={920} y={80} w={130} h={100}
      pinsTop={4} pinsBottom={4} pinsLeft={3} pinsRight={3} pinLen={20} />
    <circle className="hero-via" cx="920" cy="80" r="4" />

    {/* ADC VCC ← power rail */}
    <path className="hero-tr" d="M700 38 H800 V60 H920 V80" />
    <circle className="hero-via" cx="800" cy="60" r="3" />
    {/* decoupling cap */}
    <path className="hero-tr" d="M800 60 V78" />
    <g transform="translate(800,84) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M800 96 V110 M788 110 H812 M791 115 H809 M794 120 H806" />

    {/* ADC output → MCU right pin bus (y=200→260) */}
    <path className="hero-tr" d="M1050 100 H1090 V200 H752" />
    <path className="hero-tr" d="M1050 120 H1080 V230 H752" />
    <path className="hero-tr" d="M1050 140 H1070 V260 H752" />
    <circle className="hero-via" cx="1090" cy="200" r="3" />
    <circle className="hero-via" cx="1080" cy="230" r="3" />
    <circle className="hero-via" cx="1070" cy="260" r="3" />

    {/* ADC sensor inputs ← right side (analog signals) */}
    <path className="hero-tr" d="M1050 160 H1100 V60 H1200" />
    <circle className="hero-via" cx="1100" cy="60" r="3" />
    {/* sensor resistor divider */}
    <path className="hero-tr" d="M1200 60 H1220" />
    <g transform="translate(1234,60)"><InlineRes /></g>
    <path className="hero-tr" d="M1248 60 H1280 V30 H1440" />
    <path className="hero-tr" d="M1234 60 V80" />
    <g transform="translate(1234,92) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M1234 104 V116 M1222 116 H1246 M1225 121 H1243 M1228 126 H1240" />
    <circle className="hero-via" cx="1234" cy="60" r="3" />

    {/* ════════════════════════════════════════════════════════
        MOTOR DRIVER BLOCK  (bottom-right, 960,400 — 160×140)
        ════════════════════════════════════════════════════════ */}

    <IcBlock x={960} y={400} w={160} h={140}
      pinsTop={5} pinsBottom={5} pinsLeft={4} pinsRight={4} pinLen={20} />
    <circle className="hero-via" cx="960" cy="400" r="4" />

    {/* PWM control ← MCU right pins */}
    <path className="hero-tr" d="M752 290 H820 V380 H960 V400" />
    <path className="hero-tr" d="M752 320 H840 V390 H950" />
    <circle className="hero-via" cx="820" cy="380" r="3" />
    <circle className="hero-via" cx="840" cy="390" r="3" />

    {/* Motor driver VCC ← power rail */}
    <path className="hero-tr" d="M996 400 V360 H880 V38" />
    <circle className="hero-via" cx="880" cy="38" r="3" />
    <circle className="hero-via" cx="880" cy="360" r="3" />
    {/* bootstrap cap */}
    <path className="hero-tr" d="M880 360 H900" />
    <g transform="translate(914,360) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M880 360 V380 M868 380 H892" />

    {/* MOSFET high-side output */}
    <path className="hero-tr" d="M1120 400 V360" />
    <g transform="translate(1120,346) rotate(-90)"><InlineMosfet /></g>
    <path className="hero-tr" d="M1120 330 V310 H1200 V280" />
    <circle className="hero-via" cx="1200" cy="280" r="3" />
    {/* freewheeling diode across motor */}
    <path className="hero-tr" d="M1200 280 H1260" />
    <g transform="translate(1274,280)"><InlineDiode /></g>
    <path className="hero-tr" d="M1286 280 H1340 V420 H1200" />
    <circle className="hero-via" cx="1340" cy="420" r="3" />

    {/* Motor output connector */}
    <path className="hero-tr" d="M1120 540 V560" />
    <rect className="hero-tr" x="1080" y="560" width="80" height="50" rx="2" />
    <path className="hero-tr" d="M1090 572 H1150 M1090 582 H1150 M1090 592 H1150" />

    {/* MOSFET low-side */}
    <path className="hero-tr" d="M1140 540 V520" />
    <g transform="translate(1140,508) rotate(-90)"><InlineMosfet /></g>
    <path className="hero-tr" d="M1140 494 V480 H1060 V540" />
    <circle className="hero-via" cx="1060" cy="480" r="3" />

    {/* bootstrap + gate resistors */}
    <path className="hero-tr" d="M960 420 H930 V380 H880" />
    <path className="hero-tr" d="M930 420 H910" />
    <g transform="translate(896,420)"><InlineRes /></g>
    <path className="hero-tr" d="M882 420 H860 V460 H820" />
    <circle className="hero-via" cx="860" cy="460" r="3" />

    {/* ════════════════════════════════════════════════════════
        COMMS BLOCK  (bottom-left, 60,430 — 140×100)
        ════════════════════════════════════════════════════════ */}

    <IcBlock x={60} y={430} w={140} h={100}
      pinsTop={4} pinsBottom={4} pinsLeft={3} pinsRight={3} pinLen={18} />
    <circle className="hero-via" cx="60" cy="430" r="4" />

    {/* UART ← MCU left pins */}
    <path className="hero-tr" d="M530 290 H460 V412" />
    <path className="hero-tr" d="M530 320 H440 V412" />
    <circle className="hero-via" cx="460" cy="290" r="3" />
    <circle className="hero-via" cx="440" cy="320" r="3" />

    {/* TX/RX traces */}
    <path className="hero-tr" d="M200 450 H260 L290 420 H420 V390 H530" />
    <circle className="hero-via" cx="420" cy="390" r="3" />
    <path className="hero-tr" d="M200 470 H270 L300 440 H430 V360 H530" />
    <circle className="hero-via" cx="430" cy="360" r="3" />

    {/* RS-485 termination resistor */}
    <path className="hero-tr" d="M20 450 H40" />
    <g transform="translate(50,450) rotate(90)"><InlineRes /></g>
    <path className="hero-tr" d="M50 462 V480 M38 480 H62 M41 485 H59 M44 490 H56" />

    {/* I2C bus ← MCU left pins */}
    <path className="hero-tr" d="M530 350 H480 V550 H200 V530" />
    <path className="hero-tr" d="M530 380 H490 V560 H200 V510" />
    <circle className="hero-via" cx="480" cy="350" r="3" />
    <circle className="hero-via" cx="490" cy="380" r="3" />
    {/* pull-up resistors on SDA/SCL */}
    <path className="hero-tr" d="M200 530 V510" />
    <g transform="translate(200,500) rotate(90)"><InlineRes /></g>
    <path className="hero-tr" d="M200 490 V478 H240 V460 H280" />
    <circle className="hero-via" cx="200" cy="460" r="3" />

    {/* NPN transistor level-shifter */}
    <path className="hero-tr" d="M280 460 H300" />
    <g transform="translate(314,460)"><InlineNpn /></g>
    <path className="hero-tr" d="M328 446 V430 H380 V400 H530" />
    <path className="hero-tr" d="M328 474 V490 M316 490 H340 M319 495 H337 M322 500 H334" />
    <circle className="hero-via" cx="380" cy="400" r="3" />

    {/* ════════════════════════════════════════════════════════
        RELAY OUTPUT BLOCK  (mid-left, 60,260)
        ════════════════════════════════════════════════════════ */}

    <path className="hero-tr" d="M530 250 H490 V240 H200 V270" />
    <circle className="hero-via" cx="490" cy="250" r="3" />
    <g transform="translate(200,294)"><InlineRelay /></g>
    <path className="hero-tr" d="M200 316 V340 H140 V380" />
    {/* relay contacts */}
    <path className="hero-tr" d="M140 380 H80" />
    <g transform="translate(66,380)"><InlineSwitch /></g>
    <path className="hero-tr" d="M46 380 H20 V420" />
    <path className="hero-tr" d="M20 420 H60 V430" />
    <circle className="hero-via" cx="140" cy="380" r="3" />

    {/* ════════════════════════════════════════════════════════
        CRYSTAL / OSC (top-centre, feeds MCU)
        ════════════════════════════════════════════════════════ */}

    <path className="hero-tr" d="M594 160 V130" />
    <path className="hero-tr" d="M622 160 V130" />
    {/* crystal symbol */}
    <path className="hero-tr" d="M594 130 H622 M602 130 V108 M614 130 V108 M598 108 H618 M598 100 H618" />
    {/* load caps */}
    <path className="hero-tr" d="M594 100 V88" />
    <g transform="translate(594,82) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M594 76 V64 M582 64 H606" />
    <path className="hero-tr" d="M622 100 V88" />
    <g transform="translate(622,82) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M622 76 V64 M610 64 H634" />

    {/* ════════════════════════════════════════════════════════
        MISC JUNCTION DOTS on shared nets
        ════════════════════════════════════════════════════════ */}
    <circle className="hero-via" cx="200" cy="270" r="3" />
    <circle className="hero-via" cx="200" cy="510" r="3" />
    <circle className="hero-via" cx="950" cy="390" r="3" />
    <circle className="hero-via" cx="1120" cy="494" r="3" />
    <circle className="hero-via" cx="1280" cy="30" r="4" />

    {/* ── Traveling signal pulses (glow) over signature nets ── */}
    {/* pathLength=100 normalizes each net so one dash crosses it per cycle */}
    <g>
      <path className="hero-pulse" pathLength={100} d="M270 80 H310 V38 H700" />
      <path
        className="hero-pulse-2"
        pathLength={100}
        style={{ animationDelay: "-2.5s" }}
        d="M1050 100 H1090 V200 H752"
      />
      <path
        className="hero-pulse-3"
        pathLength={100}
        style={{ animationDelay: "-4s" }}
        d="M752 290 H820 V380 H960 V400"
      />
      <path
        className="hero-pulse"
        pathLength={100}
        style={{ animationDelay: "-3.2s" }}
        d="M530 350 H480 V550 H200 V530"
      />
      <path
        className="hero-pulse-2"
        pathLength={100}
        style={{ animationDelay: "-6s" }}
        d="M200 450 H260 L290 420 H420 V390 H530"
      />
      <path
        className="hero-pulse-3"
        pathLength={100}
        style={{ animationDelay: "-1.5s" }}
        d="M700 38 H800 V60 H920 V80"
      />
      <path
        className="hero-pulse"
        pathLength={100}
        style={{ animationDelay: "-5s" }}
        d="M996 400 V360 H880 V38"
      />
      <path
        className="hero-pulse-2"
        pathLength={100}
        style={{ animationDelay: "-4.5s" }}
        d="M530 380 H490 V560 H200 V510"
      />
      <path
        className="hero-pulse-3"
        pathLength={100}
        style={{ animationDelay: "-8s" }}
        d="M200 470 H270 L300 440 H430 V360 H530"
      />
      <path
        className="hero-pulse"
        pathLength={100}
        style={{ animationDelay: "-1s" }}
        d="M1286 280 H1340 V420 H1200"
      />
      <path
        className="hero-pulse-2"
        pathLength={100}
        style={{ animationDelay: "-7s" }}
        d="M530 250 H490 V240 H200 V270"
      />
    </g>

  </g>
)

const HeroTraces = () => (
  <svg
    viewBox="0 0 1440 700"
    preserveAspectRatio="xMidYMid slice"
    className="h-full w-full"
    fill="none"
    aria-hidden
  >
    <HeroSchematic />
  </svg>
)

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
        className="pointer-events-none absolute inset-0 text-primary opacity-30 dark:opacity-40"
        style={{
          maskImage:
            "radial-gradient(ellipse 75% 90% at 50% 40%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 90% at 50% 40%, black 30%, transparent 75%)",
        }}
      >
        <HeroTraces />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 text-muted-foreground opacity-30 dark:text-white dark:opacity-30"
      >
        {SYMBOLS.map(({ El, className, spin }, i) => (
          <DraggableSymbol
            key={i}
            id={`hero-symbol-${i}`}
            index={i}
            className={className}
          >
            {spin ? (
              <div
                className="animate-hero-spin-slow h-full w-full"
                style={{
                  animationDuration: `${13 + ((i * 5) % 8)}s`,
                  animationDelay: `${-(i * 1.3)}s`,
                }}
              >
                <El />
              </div>
            ) : (
              <El />
            )}
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

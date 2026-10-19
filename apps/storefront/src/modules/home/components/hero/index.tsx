"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import SearchField from "@modules/store/components/search-field"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

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
// HeroSchematic — "NF-CTRL v1", 12V DC motor-control board. Same blocks and
// positions as before; this revision only re-routes wiring so that no trace
// crosses an IC body, another trace, or a pin stub:
//
//   - Every wire now lands on a real pin tip (ADC top pins were 6px off, the
//     MCU decoupling/crystal drops were off-pin, U5 VM came off the body edge).
//   - MCU: top = VDD x4 / OSCI / OSCO / VDDA, bottom = GND / BOOT0 / NRST.
//     Ground symbols and the old ALRT + VBUS wires no longer run inside the body.
//   - Side buses use nested fan-out lanes (SPI x=772/792/812, PWM x=876/896,
//     UART x=372/392, SWD x=762/772) so lanes never cross each other.
//   - Long rails that used to cut through other blocks (5V to K1 / U5 / divider,
//     3V3 to ADC) are now short local "5V" / "3V3" flags or a clean feed.
//   - Half-bridge (Q2/Q3/D8/M1) redrawn as one PHASE column with real
//     MOSFET terminals; R6/R7 divider and NTC chain moved clear of the SPI lanes.
// Pulse overlay paths below follow the new traces exactly.
// Not SPICE-simulated; checked geometrically (no crossings / body intrusions).
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
        POWER MANAGEMENT BLOCK  (top-left)
        ════════════════════════════════════════════════════════ */}

    {/* VIN connector J1 */}
    <path className="hero-tr" d="M20 80 H60" />
    <rect className="hero-tr" x="60" y="60" width="36" height="40" rx="2" />
    <path className="hero-tr" d="M62 72 H84 M62 80 H84 M62 88 H84" />
    <g className="hero-ref" textAnchor="middle">
      <text x="38" y="68">12V</text>
    </g>
    <g className="hero-ref hero-ic" textAnchor="middle">
      <text x="78" y="50">J1 12V IN</text>
    </g>

    {/* VIN → F1 fuse → D1 Schottky → U1 regulator */}
    <path className="hero-tr" d="M96 80 H118" />
    <rect className="hero-tr" x="118" y="72" width="22" height="16" rx="2" />
    <path className="hero-tr" d="M122 80 H136" />
    <circle className="hero-via" cx="140" cy="80" r="3" />
    <path className="hero-tr" d="M140 80 H162" />
    <g transform="translate(174,80)"><InlineDiode /></g>
    <path className="hero-tr" d="M186 80 H194" />
    <g className="hero-ref" textAnchor="middle">
      <text x="122" y="64">F1 1.5A</text>
      <text x="180" y="64">D1 SS34</text>
    </g>

    {/* C1 bulk on VIN */}
    <path className="hero-tr" d="M150 80 V94" />
    <circle className="hero-via" cx="150" cy="80" r="3" />
    <g transform="translate(150,106) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M150 118 V126 M138 126 H162 M141 131 H159 M144 136 H156" />
    {/* C2 100n on U1 VIN */}
    <path className="hero-tr" d="M190 80 V92" />
    <circle className="hero-via" cx="190" cy="80" r="3" />
    <g transform="translate(190,104) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M190 116 V124 M178 124 H202 M181 129 H199 M184 134 H196" />
    <g className="hero-ref" textAnchor="middle">
      <text x="150" y="148">C1 470u</text>
      <text x="212" y="150">C2 100n</text>
    </g>

    {/* U1 5V LDO — VIN left, VOUT right, GND bottom (3 real pins only) */}
    <IcBlock x={210} y={58} w={60} h={44} pinsLeft={1} pinsRight={1} pinsBottom={1} pinLen={16} />
    <path className="hero-tr" d="M240 118 V130 M228 130 H252 M231 135 H249 M234 140 H246" />
    <g className="hero-ref hero-ic" textAnchor="middle">
      <text x="240" y="53">U1 AMS1117-5V</text>
    </g>

    {/* U1 VOUT → 5V node (310,80): rail up, C3 down, U2 VIN right */}
    <path className="hero-tr" d="M286 80 H324" />
    <circle className="hero-via" cx="310" cy="80" r="3" />
    <path className="hero-tr" d="M310 80 V38 H640" />
    {/* C3 22u on 5V */}
    <path className="hero-tr" d="M310 80 V92" />
    <g transform="translate(310,104) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M310 116 V128 M298 128 H322 M301 133 H319 M304 138 H316" />
    <g className="hero-ref" textAnchor="middle">
      <text x="618" y="28">5V</text>
      <text x="310" y="150">C3 22u</text>
    </g>

    {/* ─ D6 TVS clamp across 5V ─ */}
    <path className="hero-tr" d="M456 38 V48" />
    <g transform="translate(456,60) rotate(90)"><InlineZener /></g>
    <path className="hero-tr" d="M456 72 V84 M446 84 H466 M448 89 H464 M451 94 H461" />
    <circle className="hero-via" cx="456" cy="38" r="3" />
    <g className="hero-ref" textAnchor="start">
      <text x="470" y="66">D6 TVS15V</text>
    </g>

    {/* ─ D4 green power LED on 5V with R1 bias ─ */}
    <path className="hero-tr" d="M560 38 V48" />
    <g transform="translate(560,62) rotate(90)"><InlineRes /></g>
    <g transform="translate(560,88) rotate(90)"><InlineLed /></g>
    <path className="hero-tr" d="M560 100 V108 M548 108 H572 M551 113 H569 M554 118 H566" />
    <circle className="hero-via" cx="560" cy="38" r="3" />
    <g className="hero-ref" textAnchor="end">
      <text x="546" y="52">R1 1k</text>
      <text x="546" y="92">D4 GRN</text>
    </g>

    {/* U2 3V3 LDO fed from the 5V node */}
    <IcBlock x={340} y={58} w={60} h={44} pinsLeft={1} pinsRight={1} pinsBottom={1} pinLen={16} />
    <path className="hero-tr" d="M370 118 V130 M358 130 H382 M361 135 H379 M364 140 H376" />
    <g className="hero-ref hero-ic" textAnchor="middle">
      <text x="380" y="53">U2 AMS1117-3V3</text>
    </g>

    {/* U2 VOUT → 3V3 rail (y=128) feeding MCU VDD pins 555/580/605/630 */}
    <path className="hero-tr" d="M416 80 H436 V128 H630 V138" />
    <path className="hero-tr" d="M555 128 V138 M580 128 V138 M605 128 V138" />
    <circle className="hero-via" cx="555" cy="128" r="3" />
    <circle className="hero-via" cx="580" cy="128" r="3" />
    <circle className="hero-via" cx="605" cy="128" r="3" />
    {/* C5 22u + C10/C11 100n, hung from the rail left of the MCU */}
    <path className="hero-tr" d="M456 128 V140" />
    <circle className="hero-via" cx="456" cy="128" r="3" />
    <g transform="translate(456,152) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M456 164 V170 M447 170 H465 M450 175 H462 M453 180 H459" />
    <path className="hero-tr" d="M480 128 V140" />
    <circle className="hero-via" cx="480" cy="128" r="3" />
    <g transform="translate(480,152) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M480 164 V170 M471 170 H489 M474 175 H486 M477 180 H483" />
    <path className="hero-tr" d="M504 128 V140" />
    <circle className="hero-via" cx="504" cy="128" r="3" />
    <g transform="translate(504,152) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M504 164 V170 M495 170 H513 M498 175 H510 M501 180 H507" />
    <g className="hero-ref" textAnchor="end">
      <text x="440" y="150">C5 22u</text>
    </g>
    <g className="hero-ref" textAnchor="middle">
      <text x="492" y="120">C10-C11 100n</text>
      <text x="598" y="120">3V3</text>
    </g>

    {/* ════════════════════════════════════════════════════════
        MCU BLOCK  (centre, 530,160 — 200×260)
        top pins: 555/580/605/630 VDD · 655 OSCI · 680 OSCO · 705 VDDA
        ════════════════════════════════════════════════════════ */}

    <IcBlock x={530} y={160} w={200} h={260}
      pinsTop={7} pinsBottom={7} pinsLeft={9} pinsRight={9} pinLen={22} />
    <circle className="hero-via" cx="530" cy="160" r="4" />

    {/* Crystal Y1 on OSCI/OSCO (655/680) with load caps either side */}
    <path className="hero-tr" d="M655 138 V84 M680 138 V84" />
    <path className="hero-tr" d="M655 84 H661 M661 77 V91 M674 77 V91 M674 84 H680" />
    <path className="hero-tr" d="M663 79 H672 V89 H663 Z" />
    {/* C14 on OSCI */}
    <path className="hero-tr" d="M655 104 H642 V112" />
    <circle className="hero-via" cx="655" cy="104" r="3" />
    <g transform="translate(642,124) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M642 136 V142 M636 142 H648 M638 147 H646 M640 152 H644" />
    {/* C15 on OSCO */}
    <path className="hero-tr" d="M680 104 H693 V112" />
    <circle className="hero-via" cx="680" cy="104" r="3" />
    <g transform="translate(693,124) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M693 136 V142 M687 142 H699 M689 147 H697 M691 152 H695" />
    <g className="hero-ref" textAnchor="middle">
      <text x="667" y="56">Y1 8MHz</text>
      <text x="662" y="69">C14/C15 22p</text>
    </g>

    {/* VDDA (705) → 3V3 feed up and across to the ADC VCC pin */}
    <path className="hero-tr" d="M705 138 V50 H946 V60" />
    <circle className="hero-via" cx="705" cy="138" r="3" />
    <circle className="hero-via" cx="946" cy="60" r="3" />
    {/* C16 100n on the ADC feed */}
    <path className="hero-tr" d="M800 50 V54" />
    <circle className="hero-via" cx="800" cy="50" r="3" />
    <g transform="translate(800,66) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M800 78 V84 M788 84 H812 M791 89 H809 M794 94 H806" />
    <g className="hero-ref" textAnchor="start">
      <text x="814" y="70">C16 100n</text>
    </g>
    <g className="hero-ref" textAnchor="middle">
      <text x="744" y="44">3V3</text>
    </g>

    {/* ── Bottom pins: GND 555 · BOOT0 580 · NRST 630 ── */}
    {/* MCU GND */}
    <path className="hero-tr" d="M555 442 V452 M547 452 H563 M550 457 H560 M553 462 H557" />
    {/* BOOT0 strap: R9 10k to ground */}
    <path className="hero-tr" d="M580 442 V454" />
    <g transform="translate(580,468) rotate(90)"><InlineRes /></g>
    <path className="hero-tr" d="M580 482 V520" />
    {/* NRST node (630,462): C8 down, S1 left, R3 pull-up right */}
    <path className="hero-tr" d="M630 442 V466" />
    <circle className="hero-via" cx="630" cy="462" r="3" />
    <g transform="translate(630,478) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M630 490 V520" />
    <path className="hero-tr" d="M630 462 H606 V470" />
    <rect className="hero-tr" x="598" y="470" width="16" height="10" rx="1" />
    <path className="hero-tr" d="M606 480 V520" />
    <path className="hero-tr" d="M630 462 H646" />
    <g transform="translate(660,462)"><InlineRes /></g>
    <path className="hero-tr" d="M674 462 H692 V470" />
    {/* local ground rail + symbol */}
    <path className="hero-tr" d="M580 520 H630" />
    <circle className="hero-via" cx="580" cy="520" r="3" />
    <circle className="hero-via" cx="606" cy="520" r="3" />
    <circle className="hero-via" cx="630" cy="520" r="3" />
    <path className="hero-tr" d="M606 520 V526 M594 526 H618 M597 531 H615 M600 536 H612" />
    <g className="hero-ref" textAnchor="middle">
      <text x="664" y="478">R3 10k</text>
      <text x="698" y="482">3V3</text>
    </g>
    <g className="hero-ref" textAnchor="end">
      <text x="624" y="456">NRST</text>
      <text x="574" y="500">R9 10k</text>
    </g>
    <g className="hero-ref" textAnchor="start">
      <text x="638" y="502">C8 100n</text>
      <text x="612" y="506">S1</text>
    </g>

    {/* ── MCU pin legends (inside the IC body, dark mode only) ── */}
    <g className="hero-ref hero-pin-label" textAnchor="start">
      <text x="538" y="190">PA9/TX</text>
      <text x="538" y="216">PA10/RX</text>
      <text x="538" y="242">NC</text>
      <text x="538" y="268">NC</text>
      <text x="538" y="294">PC13/RLY</text>
      <text x="538" y="320">PB6/SCL</text>
      <text x="538" y="346">PB7/SDA</text>
      <text x="538" y="372">PA2/TXD</text>
      <text x="538" y="398">PA3/RXD</text>
    </g>
    <g className="hero-ref hero-pin-label" textAnchor="end">
      <text x="722" y="190">SCK</text>
      <text x="722" y="216">MISO</text>
      <text x="722" y="242">MOSI</text>
      <text x="722" y="268">ALRT</text>
      <text x="722" y="294">PWM_HI</text>
      <text x="722" y="320">PWM_LO</text>
      <text x="722" y="346">SWDIO</text>
      <text x="722" y="372">SWCLK</text>
      <text x="722" y="398">NC</text>
    </g>
    <g className="hero-ref hero-pin-label" textAnchor="middle">
      <text x="555" y="172">VDD</text>
      <text x="580" y="172">VDD</text>
      <text x="605" y="172">VDD</text>
      <text x="630" y="172">VDD</text>
      <text x="655" y="172">XI</text>
      <text x="680" y="172">XO</text>
      <text x="705" y="172">VDA</text>
    </g>
    <g className="hero-ref hero-pin-label" textAnchor="middle">
      <text x="555" y="418">GND</text>
      <text x="580" y="418">B0</text>
      <text x="630" y="418">NRST</text>
    </g>
    {/* MCU refdes — always visible */}
    <g className="hero-ref hero-ic" textAnchor="middle">
      <text x="630" y="294">STM32F103</text>
    </g>

    {/* ── MCU LEFT SIDE ── */}
    {/* RLY drive → R5 → Q1 base (routed above the relay block) */}
    <path className="hero-tr" d="M508 290 H490 V224 H130 V248" />
    <circle className="hero-via" cx="508" cy="290" r="3" />
    {/* I2C: SCL (316) and SDA (342) each fan left, then up into a 4k7 pull-up */}
    <path className="hero-tr" d="M508 316 H470 V304" />
    <path className="hero-tr" d="M508 342 H400 V304" />
    <circle className="hero-via" cx="508" cy="316" r="3" />
    <circle className="hero-via" cx="508" cy="342" r="3" />
    <g transform="translate(470,290) rotate(90)"><InlineRes /></g>
    <g transform="translate(400,290) rotate(90)"><InlineRes /></g>
    <path className="hero-tr" d="M470 276 V268 M400 276 V268" />
    <g className="hero-ref" textAnchor="middle">
      <text x="470" y="262">3V3</text>
      <text x="400" y="262">3V3</text>
      <text x="452" y="336">SDA</text>
      <text x="490" y="310">SCL</text>
    </g>
    <g className="hero-ref" textAnchor="end">
      <text x="392" y="294">R14 4k7</text>
      <text x="462" y="294">R15 4k7</text>
    </g>
    {/* UART: RO → TXD (368), DI ← RXD (394); lanes nested so they never cross */}
    <path className="hero-tr" d="M318 425 H372 V368 H508" />
    <path className="hero-tr" d="M318 475 H392 V394 H508" />
    <circle className="hero-via" cx="508" cy="368" r="3" />
    <circle className="hero-via" cx="508" cy="394" r="3" />
    <circle className="hero-via" cx="318" cy="425" r="3" />
    <circle className="hero-via" cx="318" cy="475" r="3" />
    <g className="hero-ref" textAnchor="middle">
      <text x="440" y="362">TXD</text>
      <text x="450" y="388">RXD</text>
    </g>

    {/* ════════════════════════════════════════════════════════
        ADC / SENSOR BLOCK  (top-right, 920,80 — 130×100)
        ════════════════════════════════════════════════════════ */}

    <IcBlock x={920} y={80} w={130} h={100}
      pinsTop={4} pinsBottom={4} pinsLeft={3} pinsRight={3} pinLen={20} />
    <circle className="hero-via" cx="920" cy="80" r="4" />
    <g className="hero-ref hero-ic" textAnchor="middle">
      <text x="985" y="140">ADS1115</text>
    </g>
    <g className="hero-ref hero-ic" textAnchor="end">
      <text x="908" y="196">U4 SENSE</text>
    </g>
    {/* ADC pin legends — dark mode only */}
    <g className="hero-ref hero-pin-label" textAnchor="start">
      <text x="928" y="109">SCK</text>
      <text x="928" y="134">MISO</text>
      <text x="928" y="159">MOSI</text>
    </g>
    <g className="hero-ref hero-pin-label" textAnchor="end">
      <text x="1042" y="109">NC</text>
      <text x="1042" y="134">AIN1</text>
      <text x="1042" y="159">NC</text>
    </g>
    <g className="hero-ref hero-pin-label" textAnchor="middle">
      <text x="946" y="92">VCC</text>
      <text x="972" y="92">GND</text>
      <text x="998" y="92">NC</text>
      <text x="1024" y="92">AIN0</text>
      <text x="946" y="174">ALRT</text>
      <text x="972" y="174">AGND</text>
      <text x="998" y="174">NC</text>
      <text x="1024" y="174">AIN2</text>
    </g>
    {/* GND (top pin 972) */}
    <path className="hero-tr" d="M972 60 V48 M960 48 H984 M963 43 H981 M966 38 H978" />

    {/* SPI to the MCU: three nested lanes (x=772/792/812) — no crossings */}
    <path className="hero-tr" d="M752 186 H772 V105 H900" />
    <path className="hero-tr" d="M752 212 H792 V130 H900" />
    <path className="hero-tr" d="M752 238 H812 V155 H900" />
    <circle className="hero-via" cx="752" cy="186" r="3" />
    <circle className="hero-via" cx="752" cy="212" r="3" />
    <circle className="hero-via" cx="752" cy="238" r="3" />
    <circle className="hero-via" cx="900" cy="105" r="3" />
    <circle className="hero-via" cx="900" cy="130" r="3" />
    <circle className="hero-via" cx="900" cy="155" r="3" />
    <g className="hero-ref" textAnchor="middle">
      <text x="886" y="99">SCK</text>
      <text x="886" y="124">MISO</text>
      <text x="886" y="149">MOSI</text>
    </g>

    {/* ALRT: MCU right pin 264 → ADC bottom pin 946 (comes in from below) */}
    <path className="hero-tr" d="M752 264 H860 V226 H946 V200" />
    <circle className="hero-via" cx="752" cy="264" r="3" />
    <circle className="hero-via" cx="946" cy="200" r="3" />
    <g className="hero-ref" textAnchor="middle">
      <text x="904" y="220">ALRT</text>
    </g>
    {/* AGND (bottom pin 972) */}
    <path className="hero-tr" d="M972 200 V212 M960 212 H984 M963 217 H981 M966 222 H978" />
    {/* NC (bottom pin 998) */}
    <g className="hero-ref" textAnchor="middle">
      <text x="998" y="222">NC</text>
    </g>

    {/* NTC thermistor on AIN2 (bottom pin 1024): R8 10k pull-up to 5V, RT1 to GND */}
    <path className="hero-tr" d="M1024 200 V222" />
    <circle className="hero-via" cx="1024" cy="212" r="3" />
    <path className="hero-tr" d="M1024 212 H1038" />
    <g transform="translate(1052,212)"><InlineRes /></g>
    <path className="hero-tr" d="M1066 212 H1076 V204" />
    <g transform="translate(1024,236) rotate(90)"><InlineRes /></g>
    <path className="hero-tr" d="M1024 250 V262 M1012 262 H1036 M1015 267 H1033 M1018 272 H1030" />
    <g className="hero-ref" textAnchor="middle">
      <text x="1076" y="198">5V</text>
      <text x="1056" y="230">R8 10k</text>
    </g>
    <g className="hero-ref" textAnchor="start">
      <text x="1036" y="246">RT1 NTC</text>
    </g>

    {/* 5V monitor on the right: R6/R7 divider into AIN1 (right pin 130) */}
    <path className="hero-tr" d="M1100 90 V98" />
    <g transform="translate(1100,112) rotate(90)"><InlineRes /></g>
    <path className="hero-tr" d="M1070 130 H1100" />
    <circle className="hero-via" cx="1100" cy="130" r="3" />
    <path className="hero-tr" d="M1100 126 V132" />
    <g transform="translate(1100,146) rotate(90)"><InlineRes /></g>
    <path className="hero-tr" d="M1100 160 V170 M1088 170 H1112 M1091 175 H1109 M1094 180 H1106" />
    <g className="hero-ref" textAnchor="middle">
      <text x="1100" y="84">5V</text>
    </g>
    <g className="hero-ref" textAnchor="start">
      <text x="1114" y="112">R6 10k</text>
      <text x="1114" y="150">R7 2k</text>
    </g>

    {/* AIN0 analog input ← J5, R10 + C17 anti-alias front-end */}
    <path className="hero-tr" d="M1024 60 H1220" />
    <g transform="translate(1234,60)"><InlineRes /></g>
    <path className="hero-tr" d="M1248 60 H1280 V30 H1400" />
    <rect className="hero-tr" x="1400" y="18" width="40" height="24" rx="2" />
    <circle className="hero-via" cx="1200" cy="60" r="3" />
    <path className="hero-tr" d="M1200 60 V72" />
    <g transform="translate(1200,84) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M1200 96 V104 M1188 104 H1212 M1191 109 H1209 M1194 114 H1206" />
    <circle className="hero-via" cx="1280" cy="30" r="3" />
    <g className="hero-ref" textAnchor="middle">
      <text x="1234" y="48">R10 10k</text>
      <text x="1420" y="12" className="hero-ic">J5</text>
      <text x="1340" y="52">AIN0</text>
    </g>
    <g className="hero-ref" textAnchor="start">
      <text x="1212" y="92">C17 100n</text>
    </g>

    {/* ════════════════════════════════════════════════════════
        MOTOR DRIVER BLOCK  (bottom-right, 960,400 — 160×140)
        ════════════════════════════════════════════════════════ */}

    <IcBlock x={960} y={400} w={160} h={140}
      pinsTop={4} pinsBottom={4} pinsLeft={4} pinsRight={4} pinLen={20} />
    <circle className="hero-via" cx="960" cy="400" r="4" />
    <g className="hero-ref hero-ic" textAnchor="middle">
      <text x="1040" y="370">U5 GATE DRV</text>
    </g>
    <g className="hero-ref hero-ic" textAnchor="middle">
      <text x="1040" y="476">IR2104</text>
    </g>
    {/* U5 IR2104 pin legends — dark mode only */}
    <g className="hero-ref hero-pin-label" textAnchor="start">
      <text x="968" y="432">VCC</text>
      <text x="968" y="460">IN</text>
      <text x="968" y="488">SD</text>
      <text x="968" y="516">VSS</text>
    </g>
    <g className="hero-ref hero-pin-label" textAnchor="end">
      <text x="1112" y="432">HO</text>
      <text x="1112" y="460">VB</text>
      <text x="1112" y="488">VS</text>
      <text x="1112" y="516">LO</text>
    </g>

    {/* left pins: VCC (5V flag) · IN ← PWM1 · SD ← PWM2 · VSS → PGND */}
    <path className="hero-tr" d="M940 428 H920 V402" />
    <g className="hero-ref" textAnchor="middle"><text x="920" y="396">5V</text></g>
    <path className="hero-tr" d="M940 512 H916 V550 M904 550 H928 M907 555 H925 M910 560 H922" />

    {/* PWM from the MCU: PWM1 (pin 290) outer lane x=896, PWM2 (pin 316) inner lane x=876 */}
    <path className="hero-tr" d="M752 290 H896 V456 H940" />
    <path className="hero-tr" d="M752 316 H876 V484 H940" />
    <circle className="hero-via" cx="752" cy="290" r="3" />
    <circle className="hero-via" cx="752" cy="316" r="3" />
    <circle className="hero-via" cx="940" cy="456" r="3" />
    <circle className="hero-via" cx="940" cy="484" r="3" />
    <g className="hero-ref" textAnchor="start">
      <text x="760" y="284">PWM1</text>
      <text x="760" y="310">PWM2</text>
    </g>

    {/* right pins: HO → R11 → Q2 gate · VB/VS bootstrap C18 · LO → Q3 gate */}
    <path className="hero-tr" d="M1140 428 H1150 V330 H1172" />
    <g transform="translate(1186,330)"><InlineRes /></g>
    <path className="hero-tr" d="M1200 330 H1208" />
    <g className="hero-ref" textAnchor="middle"><text x="1186" y="316">R11 10R</text></g>

    <path className="hero-tr" d="M1140 456 H1160 V458" />
    <g transform="translate(1160,470) rotate(90)"><InlineCap /></g>
    <path className="hero-tr" d="M1160 482 V484" />
    <circle className="hero-via" cx="1160" cy="484" r="3" />
    <g className="hero-ref" textAnchor="middle"><text x="1190" y="498">C18 100n</text></g>

    <path className="hero-tr" d="M1140 484 H1228" />
    <path className="hero-tr" d="M1140 512 H1180 V548 H1208" />

    {/* Q2 high-side / Q3 low-side half bridge on the PHASE column (x=1228) */}
    <g transform="translate(1220,330)"><InlineMosfet /></g>
    <path className="hero-tr" d="M1228 316 V300" />
    <g className="hero-ref" textAnchor="middle"><text x="1228" y="294">5V</text></g>
    <path className="hero-tr" d="M1228 344 V534" />
    <circle className="hero-via" cx="1228" cy="380" r="3" />
    <circle className="hero-via" cx="1228" cy="420" r="3" />
    <circle className="hero-via" cx="1228" cy="484" r="3" />
    <g transform="translate(1220,548)"><InlineMosfet /></g>
    <path className="hero-tr" d="M1228 562 V574 M1216 574 H1240 M1219 579 H1237 M1222 584 H1234" />
    <g className="hero-ref" textAnchor="start">
      <text x="1244" y="336">Q2</text>
      <text x="1244" y="556">Q3</text>
    </g>
    <g className="hero-ref" textAnchor="middle"><text x="1228" y="602">PGND</text></g>
    <g className="hero-ref" textAnchor="end"><text x="1222" y="450">PHASE</text></g>

    {/* M1 fan connector: PHASE tap on the left, PGND pin down to its own bar */}
    <rect className="hero-tr" x="1290" y="356" width="80" height="52" rx="2" />
    <path className="hero-tr" d="M1298 368 H1362 M1298 380 H1362 M1298 392 H1362" />
    <path className="hero-tr" d="M1228 380 H1290" />
    <circle className="hero-via" cx="1290" cy="380" r="3" />
    <path className="hero-tr" d="M1330 408 V470 M1318 470 H1342 M1321 475 H1339 M1324 480 H1336" />
    <g className="hero-ref hero-ic" textAnchor="middle"><text x="1330" y="346">M1 FAN</text></g>
    <g className="hero-ref" textAnchor="middle"><text x="1330" y="496">PGND</text></g>

    {/* D8 freewheeling diode: cathode on PHASE, anode to PGND */}
    <path className="hero-tr" d="M1228 420 H1260" />
    <g transform="translate(1260,432) rotate(-90)"><InlineDiode /></g>
    <path className="hero-tr" d="M1260 444 V470 M1248 470 H1272 M1251 475 H1269 M1254 480 H1266" />
    <g className="hero-ref" textAnchor="middle"><text x="1272" y="498">D8 1N5819</text></g>

    {/* ════════════════════════════════════════════════════════
        SWD DEBUG HEADER J2 (right of the MCU)
        ════════════════════════════════════════════════════════ */}

    <rect className="hero-tr" x="790" y="392" width="20" height="56" rx="2" />
    <path className="hero-tr" d="M782 404 H790 M782 422 H790 M782 440 H790" />
    <path className="hero-tr" d="M752 342 H772 V404 H782" />
    <path className="hero-tr" d="M752 368 H762 V422 H782" />
    <circle className="hero-via" cx="752" cy="342" r="3" />
    <circle className="hero-via" cx="752" cy="368" r="3" />
    <path className="hero-tr" d="M782 440 H774 V452 M762 452 H786 M765 457 H783 M768 462 H780" />
    <g className="hero-ref hero-ic" textAnchor="middle">
      <text x="806" y="386">J2 SWD</text>
    </g>
    <g className="hero-ref hero-pin-label" textAnchor="start">
      <text x="814" y="408">SWDIO</text>
      <text x="814" y="426">SWCLK</text>
      <text x="814" y="444">GND</text>
    </g>

    {/* ════════════════════════════════════════════════════════
        COMMS BLOCK  (mid-left, 160,400 — 140×100)
        ════════════════════════════════════════════════════════ */}

    <IcBlock x={160} y={400} w={140} h={100}
      pinsTop={4} pinsBottom={4} pinsLeft={3} pinsRight={3} pinLen={18} />
    <circle className="hero-via" cx="160" cy="400" r="4" />

    {/* U6 RS-485 transceiver — pin legends (dark mode only) */}
    <g className="hero-ref hero-pin-label" textAnchor="start">
      <text x="168" y="429">A</text>
      <text x="168" y="454">B</text>
      <text x="168" y="479">GND</text>
    </g>
    <g className="hero-ref hero-pin-label" textAnchor="end">
      <text x="292" y="429">RO</text>
      <text x="292" y="454">RE/DE</text>
      <text x="292" y="479">DI</text>
    </g>
    <g className="hero-ref hero-pin-label" textAnchor="middle">
      <text x="188" y="412">NC</text>
      <text x="216" y="412">NC</text>
      <text x="244" y="412">VCC</text>
      <text x="272" y="412">NC</text>
    </g>
    {/* RE/DE tied high through a 5V flag */}
    <path className="hero-tr" d="M318 450 H338 V458" />
    <g className="hero-ref" textAnchor="middle"><text x="338" y="469">5V</text></g>
    {/* VCC ← 5V flag */}
    <path className="hero-tr" d="M244 382 V360" />
    <g className="hero-ref" textAnchor="middle"><text x="244" y="354">5V</text></g>
    <g className="hero-ref hero-ic" textAnchor="middle">
      <text x="218" y="456">U6 MAX485</text>
    </g>

    {/* J4 485 connector, A/B straight into U6, R13 120R across the pair */}
    <rect className="hero-tr" x="30" y="418" width="60" height="72" rx="2" />
    <g className="hero-ref hero-ic" textAnchor="middle">
      <text x="60" y="468">J4 485</text>
    </g>
    <g className="hero-ref hero-pin-label" textAnchor="end">
      <text x="86" y="429">A</text>
      <text x="86" y="454">B</text>
    </g>
    <path className="hero-tr" d="M90 425 H142" />
    <path className="hero-tr" d="M90 450 H142" />
    <g transform="translate(110,437) rotate(90)"><InlineRes /></g>
    <circle className="hero-via" cx="142" cy="425" r="3" />
    <circle className="hero-via" cx="142" cy="450" r="3" />
    <circle className="hero-via" cx="110" cy="425" r="3" />
    <circle className="hero-via" cx="110" cy="450" r="3" />
    <path className="hero-tr" d="M142 475 H130 V486 M118 486 H142 M121 491 H139 M124 496 H136" />
    <circle className="hero-via" cx="142" cy="475" r="3" />
    <g className="hero-ref" textAnchor="middle">
      <text x="110" y="412">R13 120R</text>
    </g>

    {/* ════════════════════════════════════════════════════════
        RELAY OUTPUT BLOCK  (mid-left)
        R5 → Q1 base · Q1 collector ← K1 coil bottom · D7 flyback across the coil
        ════════════════════════════════════════════════════════ */}

    <g transform="translate(130,262) rotate(90)"><InlineRes /></g>
    <path className="hero-tr" d="M130 276 V330 H184" />
    <g transform="translate(196,330)"><InlineNpn /></g>
    {/* K1 coil: 5V flag on top, collector of Q1 on the bottom */}
    <g transform="translate(200,294)"><InlineRelay /></g>
    <path className="hero-tr" d="M200 272 V252" />
    <g className="hero-ref" textAnchor="middle"><text x="200" y="246">5V</text></g>
    <circle className="hero-via" cx="200" cy="264" r="3" />
    <circle className="hero-via" cx="200" cy="316" r="3" />
    {/* D7 flyback across the coil (cathode to 5V side) */}
    <path className="hero-tr" d="M200 264 H232 V278" />
    <g transform="translate(232,290) rotate(-90)"><InlineDiode /></g>
    <path className="hero-tr" d="M232 302 V316 H200" />
    {/* Q1 emitter to ground */}
    <path className="hero-tr" d="M200 338 V350 M188 350 H212 M191 355 H209 M194 360 H206" />
    <g className="hero-ref" textAnchor="end">
      <text x="184" y="296">K1 5V</text>
      <text x="122" y="266">R5 1k</text>
      <text x="180" y="352">Q1 2N2222</text>
    </g>
    <g className="hero-ref" textAnchor="start">
      <text x="244" y="296">D7 1N4148</text>
    </g>

    {/* relay contacts, kept separate from the coil circuit */}
    <g transform="translate(66,380)"><InlineSwitch /></g>
    <path className="hero-tr" d="M46 380 H20 V556" />
    <path className="hero-tr" d="M86 380 H104" />
    <g className="hero-ref" textAnchor="start">
      <text x="28" y="560">RLY-NO</text>
      <text x="108" y="384">COM</text>
    </g>

    {/* ── Traveling signal pulses (glow) over signature nets ── */}
    {/* pathLength=100 normalizes each net; dashoffset 200→100 = one clean pass */}
    <g>
      {/* 5V bus: U1 VOUT → rail */}
      <path className="hero-pulse" pathLength={100} d="M286 80 H310 V38 H640" />
      {/* 3V3 rail: U2 → MCU VDD pins */}
      <path
        className="hero-pulse-3"
        pathLength={100}
        style={{ animationDelay: "-3s" }}
        d="M416 80 H436 V128 H630 V138"
      />
      {/* SPI SCK: ADC → MCU */}
      <path
        className="hero-pulse-2"
        pathLength={100}
        style={{ animationDelay: "-2.5s" }}
        d="M900 105 H772 V186 H752"
      />
      {/* PWM1: MCU → gate driver */}
      <path
        className="hero-pulse-3"
        pathLength={100}
        style={{ animationDelay: "-4s" }}
        d="M752 290 H896 V456 H940"
      />
      {/* SDA: MCU → pull-up */}
      <path
        className="hero-pulse"
        pathLength={100}
        style={{ animationDelay: "-3.2s" }}
        d="M508 342 H400 V304"
      />
      {/* TXD: U6 → MCU */}
      <path
        className="hero-pulse-2"
        pathLength={100}
        style={{ animationDelay: "-6s" }}
        d="M318 425 H372 V368 H508"
      />
      {/* ADC VCC: 3V3 → ADC */}
      <path
        className="hero-pulse-3"
        pathLength={100}
        style={{ animationDelay: "-4s" }}
        d="M705 138 V50 H946 V60"
      />
      {/* ALRT: ADC → MCU */}
      <path
        className="hero-pulse"
        pathLength={100}
        style={{ animationDelay: "-5s" }}
        d="M946 200 V226 H860 V264 H752"
      />
      {/* SCL: MCU → pull-up */}
      <path
        className="hero-pulse-2"
        pathLength={100}
        style={{ animationDelay: "-4.5s" }}
        d="M508 316 H470 V304"
      />
      {/* RXD: MCU → U6 */}
      <path
        className="hero-pulse-3"
        pathLength={100}
        style={{ animationDelay: "-8s" }}
        d="M508 394 H392 V475 H318"
      />
      {/* PHASE: half-bridge output column */}
      <path
        className="hero-pulse"
        pathLength={100}
        style={{ animationDelay: "-1s" }}
        d="M1228 344 V380 H1290"
      />
      {/* Relay drive: MCU → R5 → Q1 */}
      <path
        className="hero-pulse-2"
        pathLength={100}
        style={{ animationDelay: "-7s" }}
        d="M508 290 H490 V224 H130 V248"
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
  const t = useTranslations("home")

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
      title={t("dragHint")}
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

type HeroContent = {
  badge?: string
  subtitle?: string
  ctaLabel?: string
}

const Hero = ({ content }: { content?: HeroContent }) => {
  const sectionRef = useRef<HTMLElement | null>(null)
  const glowRef = useRef<HTMLDivElement | null>(null)
  const coordRef = useRef<HTMLSpanElement | null>(null)
  const reducedMotion = useRef(false)
  const [inside, setInside] = useState(false)
  const t = useTranslations("home")
  const stats = t.raw("stats") as string[]

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
        className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-40"
        style={{
          color: "var(--hero-trace)",
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
          {content?.badge || t("badge")}
        </p>
        <h1
          className="animate-hero-rise flex justify-center"
          style={{ animationDelay: "45ms" }}
        >
          {/* Full brand lockup artwork (public/nanofield-lockup-*.png, cropped
              from nanofield.png). The black-text original is invisible in dark
              mode, so the white-text variant swaps in via the dark: class —
              blob colors are identical in both. alt keeps the h1 accessible. */}
          <Image
            src="/nanofield-lockup-light.png"
            alt="Nanofield"
            width={938}
            height={464}
            priority
            className="h-auto w-[min(400px,72vw)] dark:hidden"
          />
          <Image
            src="/nanofield-lockup-dark.png"
            alt="Nanofield"
            width={938}
            height={464}
            priority
            className="hidden h-auto w-[min(400px,72vw)] dark:block"
          />
        </h1>
        <p
          className="animate-hero-rise text-base-regular max-w-2xl text-ui-fg-subtle small:text-large-regular"
          style={{ animationDelay: "180ms" }}
        >
          {content?.subtitle || t("subtitle")}
        </p>
        <div
          className="animate-hero-rise flex w-full justify-center px-4"
          style={{ animationDelay: "230ms" }}
        >
          <SearchField variant="hero" />
        </div>
        <div
          className="animate-hero-rise flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: "270ms" }}
        >
          <Button
            asChild
            size="lg"
            className="font-bold uppercase tracking-widest"
          >
            <LocalizedClientLink href="/store">
              {content?.ctaLabel || t("enterCatalog")}
            </LocalizedClientLink>
          </Button>
        </div>
        <dl
          className="animate-hero-rise mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          style={{ animationDelay: "360ms" }}
        >
          {stats.map((stat, i) => (
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

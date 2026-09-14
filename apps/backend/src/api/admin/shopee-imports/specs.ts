// Phase 3 (catalog-consistency): category-aware spec derivation.
//
// Raw `Variation` values stay untouched for fidelity; this module derives a
// filterable layer from them: a spec family per canonical category plus
// magnitude axes (resistance, capacitance, voltage, current, power, size,
// package). Matching is deliberately strict — a value must ENTIRELY match a
// magnitude pattern — so "Default" and free-form seller text never produce
// mislabeled specs. Family gating further scopes risky axes (a bare "10K" is
// resistance only inside the resistor family).
export type SpecFamily =
  | "resistor"
  | "capacitor"
  | "diode"
  | "transistor"
  | "mosfet"
  | "ic"
  | "switch"
  | "generic"

const FAMILY_BY_CATEGORY: Record<string, SpecFamily> = {
  resistors: "resistor",
  capacitors: "capacitor",
  "diodes & rectifiers": "diode",
  transistors: "transistor",
  mosfets: "mosfet",
  "integrated circuits": "ic",
  switches: "switch",
}

export const familyForCategory = (
  canonical: string | null | undefined
): SpecFamily => {
  if (typeof canonical !== "string") {
    return "generic"
  }
  return FAMILY_BY_CATEGORY[canonical.trim().toLowerCase()] ?? "generic"
}

// Axes each family extracts. Generic is intentionally narrow (size/package
// rarely mislead); electrical magnitudes require their family.
const FAMILY_AXES: Record<SpecFamily, ("resistance" | "capacitance" | "voltage" | "current" | "power" | "size" | "package")[]> = {
  resistor: ["resistance", "power"],
  capacitor: ["capacitance", "voltage"],
  diode: ["current", "voltage"],
  transistor: ["package", "size"],
  mosfet: ["package", "size"],
  ic: ["package", "size"],
  switch: ["current"],
  generic: ["size", "package"],
}

const num = (raw: string): string => raw.replace(",", ".")

const extractResistance = (v: string): string | null => {
  // 4K7 style first (must precede the plain-K branch).
  const k710 = /^(\d+)[kK](\d+)$/.exec(v)
  if (k710) {
    return `${k710[1]}.${k710[2]}K`
  }
  const m710 = /^(\d+)[mM](\d+)$/.exec(v)
  if (m710) {
    return `${m710[1]}.${m710[2]}M`
  }
  const m = /^(\d+(?:[.,]\d+)?)\s*([kKmM]|\u03a9|ohms?)?$/.exec(v)
  if (!m) {
    return null
  }
  if (!m[2]) {
    // Bare number: only a decimal implies a measured value (ohms via the
    // axis name). A bare integer ("10") is too ambiguous to label.
    return /[.,]/.test(m[1]) ? num(m[1]) : null
  }
  const suffix = /^[kKmM]$/.test(m[2]) ? m[2].toUpperCase() : ""
  return `${num(m[1])}${suffix}`
}

const extractCapacitance = (v: string): string | null => {
  const m = /^(\d+(?:[.,]\d+)?)\s*(pF|nF|uF|\u00b5F|\u03bcF|F)$/i.exec(v)
  if (m) {
    const raw = m[2].replace(/µ|μ/, "u")
    return `${num(m[1])}${raw.length === 2 ? `${raw[0].toLowerCase()}F` : "F"}`
  }
  // 3-digit EIA code (104 -> 100nF). Family-gated by the caller.
  const code = /^(\d)(\d)(\d)$/.exec(v)
  if (code) {
    const pf = Number(code[1] + code[2]) * Math.pow(10, Number(code[3]))
    if (pf >= 1000) {
      const nf = pf / 1000
      return `${Number.isInteger(nf) ? nf : nf.toFixed(1)}nF`
    }
    return `${pf}pF`
  }
  return null
}

const extractUnit = (v: string, unit: RegExp, out: string): string | null => {
  const m = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(?:${unit.source})$`, "i").exec(v)
  return m ? `${num(m[1])}${out}` : null
}

const extractSize = (v: string): string | null => {
  const dims = /^(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*(mm|cm)?$/i.exec(v)
  if (dims) {
    return `${num(dims[1])} x ${num(dims[2])}${dims[3] ? dims[3].toLowerCase() : ""}`.trim()
  }
  const single = /^(\d+(?:[.,]\d+)?)\s*(mm|cm)$/i.exec(v)
  return single ? `${num(single[1])}${single[2].toLowerCase()}` : null
}

const extractPackage = (v: string): string | null => {
  const m = /\b(TO-?\d+[A-Z]*|SOP-?\d+|SOT-?\d+|DIP-?\d+|QFP-?\d*|QFN-?\d+|SMA|SMB|SMC|DO-?\d+|SOD-?\d+|0805|0603|1206|0402)\b/i.exec(
    v
  )
  return m ? m[1].toUpperCase() : null
}

const EXTRACTORS = {
  resistance: extractResistance,
  capacitance: extractCapacitance,
  voltage: (v: string) => extractUnit(v, /V|volts?/, "V"),
  current: (v: string) => extractUnit(v, /A|amps?|ampere/, "A"),
  power: (v: string) => extractUnit(v, /W|watts?/, "W"),
  size: extractSize,
  package: extractPackage,
} as const

export type SpecAxis = keyof typeof EXTRACTORS

// Union of distinct axis values across a product's variants, in first-seen
// order: { spec_resistance: "10K, 22K" }. Keys always carry the spec_ prefix.
// Compound labels ("0.22 / 0,33") split on "/" first so each reading is
// extracted independently, then unioned.
export const deriveSpecs = (
  family: SpecFamily,
  values: string[]
): Record<string, string> => {
  const out: Record<string, string> = {}
  const fragments = values.flatMap((v) =>
    v
      .split("/")
      .map((f) => f.trim())
      .filter(Boolean)
  )
  for (const axis of FAMILY_AXES[family]) {
    const seen: string[] = []
    for (const raw of fragments) {
      const hit = EXTRACTORS[axis](raw)
      if (hit && !seen.includes(hit)) {
        seen.push(hit)
      }
    }
    if (seen.length) {
      out[`spec_${axis}`] = seen.join(", ")
    }
  }
  return out
}

// Import-time mirror of the shared storefront rule
// (storefront lib/util/product-datasheet.ts `getDatasheetInfo` branches 1-3:
// opt-out, direct URL, semiconductor + identifier). `datasheet_search` is
// never set by the importer, so the identifier branch covers mpn/part_number.
export const deriveHasDatasheet = (input: {
  isSemiconductor: string | boolean
  partNumber?: string | null
  mpn?: string | null
  datasheetUrl?: string | null
  noDatasheet?: string | boolean
}): boolean => {
  if (input.noDatasheet === "true" || input.noDatasheet === true) {
    return false
  }
  if (typeof input.datasheetUrl === "string" && input.datasheetUrl.trim()) {
    return true
  }
  if (input.isSemiconductor !== "true" && input.isSemiconductor !== true) {
    return false
  }
  return !!(
    (typeof input.mpn === "string" && input.mpn.trim()) ||
    (typeof input.partNumber === "string" && input.partNumber.trim())
  )
}

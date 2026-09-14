// Semiconductor datasheet resolution (catalog-consistency follow-up).
// Precedence everywhere, highest first:
//   manual operator values > curated map > auto-extracted MPN > SKU behavior.
// Automation only ever fills EMPTY fields — it can never overwrite or
// destroy human input. Pure module: no imports, usable from engine,
// backfill script, and admin widget alike.
const LEAD_PREFIX = /^(IC|TR|TRANSISTOR|DIODE|LED|CAP|RES|MOSFET|TRIAC|THYRISTOR)\b/i

const STOP_WORDS = new Set([
  "CHIP",
  "ORIGINAL",
  "TRANSISTOR",
  "DIODE",
  "CAPACITOR",
  "RESISTOR",
  "MODULE",
  "DEFAULT",
  "QUALITY",
  "NEW",
  "HIGH",
  "PRECISION",
  "POWER",
  "SEMICONDUCTOR",
  "VOLTAGE",
  "REGULATOR",
  "SWITCHING",
  "ADAPTOR",
  "ADAPTER",
  "SUPPLY",
  "BOARD",
  "CHIPSET",
])

// Pure spec readings are never part numbers ("100V", "10K", "5W").
const SPEC_PATTERN = /^\d+(?:[.,]\d+)?\s*(?:[kKmM]|[pPnNuUµμ]?[fF]|[vV]|[aA]|[wW]|Ω|ohms?)?$/

const isMpnCandidate = (token: string): boolean => {
  const t = token.toUpperCase()
  if (t.length < 4 || STOP_WORDS.has(t)) {
    return false
  }
  if (!/[0-9]/.test(t) || !/[A-Z]/.test(t)) {
    return false
  }
  if (SPEC_PATTERN.test(t)) {
    return false
  }
  return /^[A-Z0-9-]+$/.test(t)
}

// Extracts the manufacturer part number embedded in a product title:
// "IC NE555/ NE 555 Chip" -> "NE555", "LM7805 5V …" -> "LM7805".
// First slash-alternative only (the canonical form); longest candidate wins
// ("2SK2488" over "K2488"). Returns null when nothing qualifies.
export const extractMpn = (title: unknown): string | null => {
  if (typeof title !== "string") {
    return null
  }
  const first = title.split("/")[0] ?? ""
  const tokens = first.trim().split(/\s+/)
  while (tokens.length && LEAD_PREFIX.test(tokens[0])) {
    tokens.shift()
  }
  let best: string | null = null
  for (const token of tokens) {
    const clean = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")
    if (isMpnCandidate(clean) && (!best || clean.length > best.length)) {
      best = clean.toUpperCase()
    }
  }
  return best
}

// Curated MPN (uppercased) -> verified direct document URL. Hand-seeded and
// URL-validated (fetch: HTTP 200 + MPN present in the document); the map
// grows deliberately over time. Misses fall through to MPN search links.
const DATASHEET_MAP: Record<string, string> = {
  // Verified Sep 2026: espressif.com, HTTP 200, valid PDF, decompressed text
  // mentions ESP32-WROOM.
  "ESP32-WROOM-32":
    "https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf",
}

export const resolveDatasheetUrl = (mpn: string | null | undefined): string | null => {
  if (typeof mpn !== "string") {
    return null
  }
  const key = mpn.trim().toUpperCase()
  if (!key) {
    return null
  }
  return DATASHEET_MAP[key] ?? null
}

// Human-readable resolution chain for admin preview lines.
export const describeDatasheetSource = (input: {
  datasheetUrl?: string | null
  mpn?: string | null
}): string => {
  if (typeof input.datasheetUrl === "string" && input.datasheetUrl.trim()) {
    return "manual document"
  }
  const mapped = resolveDatasheetUrl(input.mpn)
  if (mapped) {
    return "curated document"
  }
  if (typeof input.mpn === "string" && input.mpn.trim()) {
    return `MPN search for ${input.mpn.trim()}`
  }
  return "no datasheet UI"
}

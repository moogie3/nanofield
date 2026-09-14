// Query keys + parsers for the spec/datasheet sidebar filters (Phase 5).
// Pairs look like "spec_resistance:10K" — the axis is allowlisted to spec_*
// keys so arbitrary metadata can never be probed through the URL.
export const SPEC_QUERY_KEY = "spec"
export const HAS_DATASHEET_QUERY_KEY = "has_datasheet"

export type SpecSelection = string[]

const SPEC_PAIR = /^(spec_[a-z]+):(.+)$/

const readParams = (
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string
): string[] => {
  if (typeof (searchParams as URLSearchParams).getAll === "function") {
    return (searchParams as URLSearchParams).getAll(key)
  }
  const value = (
    searchParams as Record<string, string | string[] | undefined>
  )[key]
  if (Array.isArray(value)) {
    return value.flatMap((v) => v.split(","))
  }
  if (typeof value === "string" && value.length > 0) {
    return value.split(",")
  }
  return []
}

export const parseSpecFilters = (
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): SpecSelection => {
  const pairs = readParams(searchParams, SPEC_QUERY_KEY)
  const valid = pairs
    .map((p) => p.trim())
    .filter((p) => SPEC_PAIR.test(p))
    .map((p) => {
      const [, axis, value] = p.match(SPEC_PAIR) as RegExpMatchArray
      return `${axis}:${value.trim()}`
    })
    .filter((p) => p.split(":")[1].length > 0)
  return Array.from(new Set(valid))
}

export const parseHasDatasheet = (
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): boolean => {
  const values = readParams(searchParams, HAS_DATASHEET_QUERY_KEY)
  return values.some((v) => v === "1" || v.toLowerCase() === "true")
}

// "spec_resistance:10K" -> "resistance: 10K" for empty-state + summary copy.
export const formatSpecLabel = (pair: string): string => {
  const idx = pair.indexOf(":")
  if (idx < 0) {
    return pair
  }
  return `${pair.slice(0, idx).replace(/^spec_/, "")}: ${pair.slice(idx + 1)}`
}

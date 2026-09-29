// Edge-safe locale primitives (importable from middleware).
// Server components/actions should use @lib/util/server-locale instead.

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE"

/**
 * Parses Accept-Language into a supported locale code.
 * Falls back to the default when unrecognized — callers pass it in
 * so this module stays dependency-free.
 */
export function detectLocaleFromHeader(
  acceptLanguage: string | null,
  supported: readonly string[],
  fallback: string
): string {
  const primary = acceptLanguage
    ?.split(",")[0]
    ?.split(";")[0]
    ?.trim()
    ?.split("-")[0]
    ?.toLowerCase()
  if (primary && supported.includes(primary)) {
    return primary
  }
  return fallback
}

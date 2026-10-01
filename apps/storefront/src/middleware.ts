import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"
import { routing } from "@/i18n/routing"
import {
  LOCALE_COOKIE_NAME,
  detectLocaleFromHeader,
} from "@/i18n/locale-cookie"

// Re-exported here so the edge runtime only pulls the pure helpers.

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"

const LOCALES = routing.locales as unknown as string[]
const DEFAULT_LOCALE = routing.defaultLocale
const LOCALE_HEADER = "x-nanofield-locale"
// next-intl's own header (see next-intl/dist shared/constants HEADER_LOCALE_NAME).
// Set alongside ours so getRequestLocale() resolves from the header instead
// of React cache: setRequestLocale() writes through `cache()` from the React
// copy next-intl resolves (root React 18), while the App Router renders with
// the storefront's React 19 — the write is invisible across that split, so
// requestLocale came back undefined and every page fell back to Indonesian.
// The header path has no cache involvement and is deterministic.
const NEXT_INTL_LOCALE_HEADER = "X-NEXT-INTL-LOCALE"
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (!BACKEND_URL) {
    throw new Error(
      "Middleware.ts: Error fetching regions. Did you set up regions in your Medusa Admin and define a NEXT_PUBLIC_MEDUSA_BACKEND_URL environment variable."
    )
  }

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    // Fetch regions from Medusa. We can't use the JS client here because middleware is running on Edge and the client needs a Node environment.
    const response = await fetch(`${BACKEND_URL}/store/regions`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
      cache: "force-cache",
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const json = await response.json()

    const { regions } = json

    if (!regions?.length) {
      return new Map<string, HttpTypes.StoreRegion>()
    }

    // Create a map of country codes to regions.
    // Rebuild from scratch so removed countries don't linger, and
    // normalize to lowercase since URL segments are lowercased on lookup.
    const freshMap = new Map<string, HttpTypes.StoreRegion>()
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        const code = c.iso_2?.toLowerCase()
        if (code) {
          freshMap.set(code, region)
        }
      })
    })

    regionMapCache.regionMap = freshMap
    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

/**
 * Fetches regions from Medusa and sets the region cookie.
 * @param request
 * @param response
 */
async function getCountryCode(
  urlCountryCode: string | undefined,
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  let countryCode

  // Cloudflare Workers provides country via request.cf.country
  const cloudflareCountryCode = (request as { cf?: { country?: string } }).cf
    ?.country?.toLowerCase()

  // Vercel provides x-vercel-ip-country header
  const vercelCountryCode = request.headers
    .get("x-vercel-ip-country")
    ?.toLowerCase()

  if (urlCountryCode && regionMap.has(urlCountryCode)) {
    countryCode = urlCountryCode
  } else if (cloudflareCountryCode && regionMap.has(cloudflareCountryCode)) {
    countryCode = cloudflareCountryCode
  } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
    countryCode = vercelCountryCode
  } else if (regionMap.has(DEFAULT_REGION.toLowerCase())) {
    countryCode = DEFAULT_REGION.toLowerCase()
  } else if (regionMap.keys().next().value) {
    countryCode = regionMap.keys().next().value
  }

  return countryCode
}

/** Pass-through response carrying the locale header + cookie downstream. */
function localizedNext(
  request: NextRequest,
  locale: string,
  cacheId: string,
  cacheIdCookie: { value: string } | undefined
) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(LOCALE_HEADER, locale)
  requestHeaders.set(NEXT_INTL_LOCALE_HEADER, locale)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
  })

  if (!cacheIdCookie) {
    response.cookies.set("_medusa_cache_id", cacheId, {
      maxAge: 60 * 60 * 24,
    })
  }

  return response
}

/**
 * Middleware handling locale selection, region selection, and onboarding status.
 * URL shape: /<locale>/<countryCode>/... (e.g. /id/id/store, /en/us/cart).
 */
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const segments = request.nextUrl.pathname.split("/").filter(Boolean)
  const firstSegment = segments[0]?.toLowerCase()

  // 1. Locale: must be the first segment. Missing/unknown -> detect and redirect.
  if (!firstSegment || !LOCALES.includes(firstSegment)) {
    const cookieLocale = request.cookies
      .get(LOCALE_COOKIE_NAME)
      ?.value?.toLowerCase()
    const detected =
      cookieLocale && LOCALES.includes(cookieLocale)
        ? cookieLocale
        : detectLocaleFromHeader(
            request.headers.get("accept-language"),
            LOCALES,
            DEFAULT_LOCALE
          )

    const url = request.nextUrl.clone()
    const rest =
      request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
    url.pathname = `/${detected}${rest}`

    const response = NextResponse.redirect(url, 307)
    response.cookies.set(LOCALE_COOKIE_NAME, detected, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: "/",
    })
    return response
  }

  const locale = firstSegment

  // 2. Region: same logic as before, shifted one segment right.
  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)
  const urlCountryCode = segments[1]?.toLowerCase()
  const countryCode = await getCountryCode(urlCountryCode, request, regionMap)

  // if the country code is available, use it, otherwise use the default region
  const country = countryCode || DEFAULT_REGION
  const urlHasCountry = urlCountryCode === country.toLowerCase()

  if (urlHasCountry) {
    return localizedNext(request, locale, cacheId, cacheIdCookie)
  }

  // if the url doesn't have the country, redirect to it (locale preserved).
  // Everything from segments[1] on is preserved as page path: segments[1]
  // holds either the country (handled above) or the first page segment of a
  // country-less URL (e.g. /id/verify-account from emails). Dropping it here
  // used to strand shoppers on the homepage with an orphaned ?token=.
  const restAfterCountry =
    segments.length > 1 ? `/${segments.slice(1).join("/")}` : ""
  const queryString = request.nextUrl.search || ""
  const redirectUrl = `${request.nextUrl.origin}/${locale}/${country}${restAfterCountry}${queryString}`

  const response = NextResponse.redirect(redirectUrl, 307)
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
  })
  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}

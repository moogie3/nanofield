import { createNavigation } from "next-intl/navigation"
import { routing } from "./routing"

// Locale-aware navigation helpers (Link/redirect/useRouter/usePathname
// that transparently keep the /<locale> prefix). Prefer these over
// next/navigation for locale-safe navigation; LocalizedClientLink remains
// the chokepoint for links that must also persist the countryCode.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)

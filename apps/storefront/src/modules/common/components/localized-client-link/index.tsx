"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React from "react"

/**
 * Use this component to create a Next.js `<Link />` that persists the current
 * locale + country code in the url, without having to explicitly pass them
 * as props. URL shape: /<locale>/<countryCode><href>.
 */
const LocalizedClientLink = ({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode
  href: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
  passHref?: true
  [x: string]: unknown
}) => {
  const { locale, countryCode } = useParams()

  // 404/error boundaries render outside the [locale] tree, so params can be
  // empty. Fall back to the plain href instead of /undefined/undefined/...
  if (typeof locale !== "string" || typeof countryCode !== "string") {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <Link href={`/${locale}/${countryCode}${href}`} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink

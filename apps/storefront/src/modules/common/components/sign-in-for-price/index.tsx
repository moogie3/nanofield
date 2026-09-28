"use client"

import { usePathname } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Guest price placeholder: links to sign-in while preserving the current
// page, so login can send the shopper straight back (see Login return_to).
export default function SignInForPrice({
  className,
}: {
  className?: string
}) {
  const pathname = usePathname()
  const href = `/account?return_to=${encodeURIComponent(pathname)}`

  return (
    <LocalizedClientLink
      href={href}
      className={
        className ??
        "text-base-semi text-primary hover:underline whitespace-nowrap"
      }
      data-testid="sign-in-for-price"
    >
      Sign in for price
    </LocalizedClientLink>
  )
}

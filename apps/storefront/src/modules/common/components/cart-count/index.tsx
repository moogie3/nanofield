"use client"

import { createContext, useCallback, useContext, useState } from "react"

type CartCount = {
  // Optimistic delta applied on top of the server count.
  extra: number
  bump: (delta: number) => void
  // Called when fresh server data arrives — absorbs it as the new truth.
  reset: () => void
}

const CartCountContext = createContext<CartCount>({
  extra: 0,
  bump: () => {},
  reset: () => {},
})

// Makes the navbar badge react instantly to add/remove/quantity clicks
// instead of waiting for the server round-trip + page revalidation. The
// dropdown item list still opens on confirmed server data, and any drift
// self-corrects the next time server totals change. Safe to consume outside
// the provider (checkout layout): bump/reset become no-ops and counts stay
// exact.
export const CartCountProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [extra, setExtra] = useState(0)

  const bump = useCallback((delta: number) => {
    setExtra((current) => current + delta)
  }, [])

  const reset = useCallback(() => {
    setExtra(0)
  }, [])

  return (
    <CartCountContext.Provider value={{ extra, bump, reset }}>
      {children}
    </CartCountContext.Provider>
  )
}

export const useCartCount = () => useContext(CartCountContext)

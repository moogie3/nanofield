"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@medusajs/icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { addToCart } from "@lib/data/cart"
import SignInGateModal from "@modules/account/components/sign-in-gate-modal"
import { useCartCount } from "@modules/common/components/cart-count"

export default function QuickAddButton({
  variantId,
  countryCode,
  isLoggedIn = true,
}: {
  variantId: string
  countryCode: string
  isLoggedIn?: boolean
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)
  const { bump } = useCartCount()
  const t = useTranslations("product")

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Guests never touch the cart — intent gate instead.
    if (!isLoggedIn) {
      setGateOpen(true)
      return
    }
    if (isAdding || added) {
      return
    }
    // Optimistic: badge bumps instantly; the server result reconciles it.
    bump(1)
    setIsAdding(true)
    try {
      await addToCart({ variantId, quantity: 1, countryCode })
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch {
      // Roll the optimistic bump back — the badge follows server truth.
      bump(-1)
      // cart errors surface on the cart page
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <Button
        size="icon-sm"
        onClick={handleAdd}
        disabled={isAdding}
        aria-label={added ? t("addedToCart") : t("addToCart")}
        className="shrink-0 transition-transform duration-200 hover:scale-110 hover:shadow-lg active:scale-95"
      >
        {isAdding ? (
          <Spinner className="animate-spin" />
        ) : (
          <HugeiconsIcon icon={added ? Tick02Icon : PlusSignIcon} strokeWidth={2} />
        )}
      </Button>
      <SignInGateModal open={gateOpen} onClose={() => setGateOpen(false)} />
    </>
  )
}

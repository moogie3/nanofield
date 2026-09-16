"use client"

import { updateLineItem } from "@lib/data/cart"
import { clx } from "@modules/common/components/ui"
import { useCartCount } from "@modules/common/components/cart-count"
import { useEffect, useState } from "react"

type QuantityStepperProps = {
  lineId: string
  quantity: number
  max?: number
  size?: "sm" | "md"
  onUpdateError?: (message: string | null) => void
  "data-testid"?: string
}

const QuantityStepper = ({
  lineId,
  quantity,
  max = 10,
  size = "md",
  onUpdateError,
  "data-testid": dataTestid,
}: QuantityStepperProps) => {
  const [updating, setUpdating] = useState(false)
  // Optimistic value so the number changes instantly on click instead of
  // waiting for the server round-trip + cache revalidation.
  const [displayQuantity, setDisplayQuantity] = useState(quantity)
  const { bump } = useCartCount()

  // Re-sync when the cart settles (e.g. after revalidation or errors).
  useEffect(() => {
    if (!updating) {
      setDisplayQuantity(quantity)
    }
  }, [quantity, updating])

  const handleChange = async (next: number) => {
    if (next < 1 || next === displayQuantity || updating) {
      return
    }
    // Clamp typed entries to stock instead of rejecting them: the cap hint
    // below tells the shopper why.
    const clamped = Math.min(next, max)
    const clampedDown = clamped < next
    const delta = clamped - displayQuantity
    if (delta === 0) {
      if (clampedDown) {
        onUpdateError?.(`Only ${max} available in stock`)
      }
      return
    }
    setDisplayQuantity(clamped)
    // Badge follows instantly; server truth reconciles it on refresh.
    bump(delta)
    setUpdating(true)
    onUpdateError?.(null)
    try {
      await updateLineItem({ lineId, quantity: clamped })
    } catch (err) {
      // Roll back to the last confirmed quantity on failure.
      bump(-delta)
      setDisplayQuantity(quantity)
      onUpdateError?.(
        err instanceof Error ? err.message : "Could not update quantity"
      )
    } finally {
      setUpdating(false)
    }
    if (clampedDown) {
      onUpdateError?.(`Only ${max} available in stock`)
    }
  }

  const [draft, setDraft] = useState<string | null>(null)

  const commitDraft = () => {
    if (draft === null) {
      return
    }
    const text = draft
    setDraft(null)
    const parsed = parseInt(text, 10)
    if (!Number.isFinite(parsed)) {
      return
    }
    void handleChange(parsed)
  }

  return (
    <div
      data-testid={dataTestid}
      className={clx(
        "inline-flex shrink-0 items-center rounded-full border border-border bg-background",
        size === "sm" ? "h-7" : "h-10",
        updating && "opacity-70"
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        data-testid="quantity-decrease-button"
        disabled={displayQuantity <= 1 || updating}
        onClick={() => handleChange(displayQuantity - 1)}
        className={clx(
          "flex items-center justify-center rounded-full transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40",
          size === "sm" ? "h-7 w-7 text-sm" : "h-10 w-9 text-base"
        )}
      >
        −
      </button>
      <input
        aria-live="polite"
        aria-label="Quantity"
        data-testid="quantity-value"
        data-value={displayQuantity}
        inputMode="numeric"
        autoComplete="off"
        value={draft ?? String(displayQuantity)}
        disabled={updating}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        className={clx(
          "bg-transparent text-center font-medium tabular-nums focus:outline-none",
          size === "sm" ? "w-7 text-xs" : "w-9 text-sm"
        )}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        data-testid="quantity-increase-button"
        disabled={displayQuantity >= max || updating}
        onClick={() => handleChange(displayQuantity + 1)}
        className={clx(
          "flex items-center justify-center rounded-full transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40",
          size === "sm" ? "h-7 w-7 text-sm" : "h-10 w-9 text-base"
        )}
      >
        +
      </button>
    </div>
  )
}

export default QuantityStepper

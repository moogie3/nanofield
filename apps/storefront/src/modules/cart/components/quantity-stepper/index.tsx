"use client"

import { updateLineItem } from "@lib/data/cart"
import { clx } from "@modules/common/components/ui"
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

  // Re-sync when the cart settles (e.g. after revalidation or errors).
  useEffect(() => {
    if (!updating) {
      setDisplayQuantity(quantity)
    }
  }, [quantity, updating])

  const handleChange = async (next: number) => {
    if (next < 1 || next > max || next === displayQuantity || updating) {
      return
    }
    setDisplayQuantity(next)
    setUpdating(true)
    onUpdateError?.(null)
    try {
      await updateLineItem({ lineId, quantity: next })
    } catch (err) {
      // Roll back to the last confirmed quantity on failure.
      setDisplayQuantity(quantity)
      onUpdateError?.(
        err instanceof Error ? err.message : "Could not update quantity"
      )
    } finally {
      setUpdating(false)
    }
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
      <span
        aria-live="polite"
        data-testid="quantity-value"
        data-value={displayQuantity}
        className={clx(
          "text-center font-medium tabular-nums",
          size === "sm" ? "w-5 text-xs" : "w-7 text-sm"
        )}
      >
        {displayQuantity}
      </span>
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

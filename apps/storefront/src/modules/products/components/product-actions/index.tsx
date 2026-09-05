"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity: 1,
      countryCode,
    })

    setIsAdding(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const docMeta = (product.metadata || {}) as Record<string, unknown>

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {String(
              docMeta.mpn || docMeta.part_number || product.title
            )}
          </span>
          {[
            (product.metadata as Record<string, unknown> | null)?.manufacturer,
            (product.metadata as Record<string, unknown> | null)?.package_case,
            (product.metadata as Record<string, unknown> | null)
              ?.mounting_type,
          ].some((v) => typeof v === "string" && v) && (
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  (product.metadata as Record<string, unknown> | null)
                    ?.manufacturer,
                  (product.metadata as Record<string, unknown> | null)
                    ?.package_case,
                  (product.metadata as Record<string, unknown> | null)
                    ?.mounting_type,
                ] as string[]
              )
                .filter(Boolean)
                .map((chip) => (
                  <span
                    key={chip}
                    className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
            </div>
          )}
          {selectedVariant && (
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${
                    inStock ? "animate-ping bg-primary opacity-60" : "bg-destructive"
                  }`}
                />
                <span
                  className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                    inStock ? "bg-primary" : "bg-destructive"
                  }`}
                />
              </span>
              {inStock
                ? typeof selectedVariant.inventory_quantity === "number" &&
                  selectedVariant.inventory_quantity > 0
                  ? `In stock · ${selectedVariant.inventory_quantity} available`
                  : "In stock"
                : "Out of stock"}
            </p>
          )}
        </div>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant
          }
          variant="primary"
          className="w-full h-10 transition-transform active:scale-[0.98]"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {added ? (
            <span className="flex items-center gap-2">
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
              Added to cart
            </span>
          ) : !selectedVariant ? (
            "Select variant"
          ) : !inStock || !isValidVariant ? (
            "Out of stock"
          ) : (
            "Add to cart"
          )}
        </Button>
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}

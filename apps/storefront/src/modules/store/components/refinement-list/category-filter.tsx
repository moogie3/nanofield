"use client"

import * as Accordion from "@radix-ui/react-accordion"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ChevronDownMini } from "@medusajs/icons"
import clsx from "clsx"
import { listCategories } from "@lib/data/categories"
import { HttpTypes } from "@medusajs/types"

type CategoryFilterProps = {
  categoryIds?: string[]
  onCategoryChange: (categoryIds: string[]) => void
}

const CategoryFilter = ({
  categoryIds = [],
  onCategoryChange,
}: CategoryFilterProps) => {
  const [categories, setCategories] = useState<
    HttpTypes.StoreProductCategory[]
  >([])
  const [openItems, setOpenItems] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await listCategories({ limit: 200 })
        setCategories(data || [])
      } catch (error) {
        console.error("Failed to fetch categories", error)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    if (categories.length) {
      setOpenItems(
        categories.filter((c) => !c.parent_category_id).map((c) => c.id),
      )
    }
  }, [categories])

  if (!mounted || !categories.length) {
    return null
  }

  // Get only top-level categories (no parent)
  const topLevelCategories = categories.filter((c) => !c.parent_category_id)

  const toggleCategory = (categoryId: string) => {
    const isSelected = categoryIds.includes(categoryId)
    const nextSelections = isSelected
      ? categoryIds.filter((id) => id !== categoryId)
      : [...categoryIds, categoryId]

    onCategoryChange(Array.from(new Set(nextSelections)))
  }

  const buildCategoryTree = (
    parentId?: string,
  ): HttpTypes.StoreProductCategory[] => {
    return categories
      .filter((c) => c.parent_category_id === parentId)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
  }

  const renderCategoryNode = (
    category: HttpTypes.StoreProductCategory,
    level = 0,
  ) => {
    const children = buildCategoryTree(category.id)
    const isSelected = categoryIds.includes(category.id)
    const hasChildren = children.length > 0
    const isOpen = openItems.includes(category.id)

    return (
      <div key={category.id} className={clsx("ml-0", level > 0 && "ml-6")}>
        <div className="flex items-center gap-2 py-1.5">
          {hasChildren && (
            <button
              onClick={() =>
                setOpenItems((prev) =>
                  isOpen
                    ? prev.filter((id) => id !== category.id)
                    : [...prev, category.id],
                )
              }
              className={clsx(
                "flex h-5 w-5 items-center justify-center text-ui-fg-muted transition-transform duration-150",
                { "rotate-180": isOpen },
              )}
              aria-expanded={isOpen}
            >
              <ChevronDownMini className="h-3.5 w-3.5" />
            </button>
          )}
          {!hasChildren && <div className="h-5 w-5" />}

          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleCategory(category.id)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background"
            />
            <span
              className={clsx(
                "txt-compact-small-plus truncate",
                isSelected ? "text-ui-fg-base font-medium" : "text-ui-fg-muted",
              )}
            >
              {category.name}
            </span>
          </label>
        </div>

        {hasChildren && isOpen && (
          <div className="mt-1 space-y-1">
            {children.map((child) => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="txt-compact-small-plus text-ui-fg-subtle">
          Categories
        </span>
      </div>
      <div className="flex flex-col gap-y-2 pr-6">
        {topLevelCategories.map((category) => renderCategoryNode(category))}
      </div>
    </div>
  )
}

export default CategoryFilter

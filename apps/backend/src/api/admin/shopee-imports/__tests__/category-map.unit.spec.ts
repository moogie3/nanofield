import {
  CANONICAL_CATEGORIES,
  canonicalCategory,
  isCanonicalCategory,
} from "../category-map"
import { buildPlans, type MediaEntry, type SalesRow } from "../engine"

describe("canonicalCategory (Phase 2)", () => {
  it("maps tail leaves to canonical buckets", () => {
    expect(canonicalCategory("Batteries")).toBe("Batteries & Accessories")
    expect(canonicalCategory("CCTV Security Cameras")).toBe(null) // already canonical
    expect(canonicalCategory("BATTERIES")).toBe("Batteries & Accessories")
    expect(canonicalCategory("  Rice Cookers ")).toBe(
      "Small Household Appliances Others"
    )
  })

  it("returns null for unmapped leaves and merch (raw passthrough)", () => {
    expect(canonicalCategory("Integrated Circuits")).toBe(null)
    expect(canonicalCategory("Merch")).toBe(null)
    expect(canonicalCategory("Some Future Leaf")).toBe(null)
    expect(canonicalCategory(null)).toBe(null)
    expect(canonicalCategory("   ")).toBe(null)
  })

  it("keeps every canonical name self-consistent", () => {
    for (const c of CANONICAL_CATEGORIES) {
      expect(isCanonicalCategory(c)).toBe(true)
    }
    expect(CANONICAL_CATEGORIES.length).toBeLessThanOrEqual(30)
  })
})

describe("buildPlans category canonicalization (Phase 2)", () => {
  const row = (): SalesRow => ({
    pid: "p1",
    name: "Battery",
    variationId: "v1",
    variationName: "Default",
    parentSku: "BAT-0001",
    price: 1000,
    stock: 5,
    weightGrams: null,
  })
  const media = (category: string | null, leaf: string | null): Map<string, MediaEntry> =>
    new Map([
      ["p1", { category, categoryPath: "Elektronik/Batteries", leaf, images: [] }],
    ])

  it("passes mapped leaves through as canonical and counts remaps", () => {
    const { plans, categoriesRemapped } = buildPlans(
      [row()],
      new Map(),
      media("Batteries & Accessories", "Batteries"),
      false
    )
    expect(plans[0].category).toBe("Batteries & Accessories")
    expect(categoriesRemapped).toBe(1)
  })

  it("leaves canonical and unmapped leaves untouched with zero remaps", () => {
    const kept = buildPlans(
      [row()],
      new Map(),
      media("Resistors", "Resistors"),
      false
    )
    expect(kept.plans[0].category).toBe("Resistors")
    expect(kept.categoriesRemapped).toBe(0)
  })
})

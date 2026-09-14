import {
  buildPlans,
  normalizeOptionValue,
  type SalesRow,
} from "../engine"

describe("normalizeOptionValue (Phase 1)", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeOptionValue("  10A  ")).toBe("10A")
    expect(normalizeOptionValue("2  x   1.5")).toBe("2 x 1.5")
  })

  it("preserves seller case (audit: zero case splits live)", () => {
    expect(normalizeOptionValue("10K")).toBe("10K")
    expect(normalizeOptionValue("10A")).toBe("10A")
  })

  it("maps empty/blank to Default", () => {
    expect(normalizeOptionValue("")).toBe("Default")
    expect(normalizeOptionValue("   ")).toBe("Default")
    expect(normalizeOptionValue(undefined)).toBe("Default")
  })
})

describe("buildPlans variantsRenamed (Phase 1)", () => {
  const row = (variationName: string): SalesRow => ({
    pid: "p1",
    name: "Resistor",
    variationId: "v1",
    variationName,
    parentSku: "RES-0001",
    price: 1000,
    stock: 5,
    weightGrams: null,
  })

  it("normalizes plan values and counts renames", () => {
    const { plans, variantsRenamed } = buildPlans(
      [row("  10K  "), row("10K")],
      new Map(),
      new Map(),
      false
    )
    expect(plans[0].variants.map((v) => v.optionValue)).toEqual([
      "10K",
      "10K",
    ])
    expect(variantsRenamed).toBe(1)
  })

  it("reports zero renames for clean input", () => {
    const { variantsRenamed } = buildPlans(
      [row("10A")],
      new Map(),
      new Map(),
      false
    )
    expect(variantsRenamed).toBe(0)
  })
})

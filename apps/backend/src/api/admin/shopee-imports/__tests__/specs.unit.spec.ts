import {
  deriveHasDatasheet,
  deriveSpecs,
  familyForCategory,
} from "../specs"
import { buildPlans, type MediaEntry, type SalesRow } from "../engine"

describe("familyForCategory (Phase 3)", () => {
  it("maps canonical categories to families", () => {
    expect(familyForCategory("Resistors")).toBe("resistor")
    expect(familyForCategory("Capacitors")).toBe("capacitor")
    expect(familyForCategory("Integrated Circuits")).toBe("ic")
    expect(familyForCategory("Batteries & Accessories")).toBe("generic")
  })

  it("falls back to generic for unknown or missing categories", () => {
    expect(familyForCategory(null)).toBe("generic")
    expect(familyForCategory("Some Future Leaf")).toBe("generic")
  })
})

describe("deriveSpecs magnitudes (Phase 3)", () => {
  it("extracts resistance, preserving style variants", () => {
    expect(deriveSpecs("resistor", ["10K"])).toEqual({
      spec_resistance: "10K",
    })
    expect(deriveSpecs("resistor", ["4K7"])).toEqual({
      spec_resistance: "4.7K",
    })
    expect(deriveSpecs("resistor", ["0,22"])).toEqual({
      spec_resistance: "0.22",
    })
  })

  it("extracts power alongside resistance", () => {
    expect(deriveSpecs("resistor", ["5W"])).toEqual({ spec_power: "5W" })
  })

  it("extracts capacitance incl EIA codes, plus voltage", () => {
    expect(deriveSpecs("capacitor", ["100nF", "25V"])).toEqual({
      spec_capacitance: "100nF",
      spec_voltage: "25V",
    })
    expect(deriveSpecs("capacitor", ["104"])).toEqual({
      spec_capacitance: "100nF",
    })
  })

  it("extracts current for fuse-like values, packages for semis", () => {
    expect(deriveSpecs("generic", ["10A"])).toEqual({})
    expect(deriveSpecs("resistor", ["10A"])).toEqual({})
    expect(deriveSpecs("diode", ["10A"])).toEqual({ spec_current: "10A" })
    expect(deriveSpecs("transistor", ["TO-220"])).toEqual({
      spec_package: "TO-220",
    })
    expect(deriveSpecs("generic", ["2 x 1.5"])).toEqual({
      spec_size: "2 x 1.5",
    })
  })

  it("never labels free text or Default", () => {
    expect(deriveSpecs("resistor", ["Default"])).toEqual({})
    expect(deriveSpecs("capacitor", ["High Quality Original"])).toEqual({})
  })

  it("unions distinct values across variants in first-seen order", () => {
    expect(deriveSpecs("resistor", ["10K", "22K", "10K"])).toEqual({
      spec_resistance: "10K, 22K",
    })
  })

  it("splits compound labels on slashes before extracting", () => {
    expect(deriveSpecs("resistor", ["0.22 / 0,33"])).toEqual({
      spec_resistance: "0.22, 0.33",
    })
  })
})

describe("deriveHasDatasheet rule parity (Phase 3)", () => {
  it("mirrors the shared storefront rule", () => {
    // opt-out always wins
    expect(
      deriveHasDatasheet({ isSemiconductor: "true", partNumber: "IC-0399", noDatasheet: "true" })
    ).toBe(false)
    // direct URL always counts
    expect(
      deriveHasDatasheet({
        isSemiconductor: "false",
        datasheetUrl: "https://example.com/x.pdf",
      })
    ).toBe(true)
    // semiconductor + identifier
    expect(
      deriveHasDatasheet({ isSemiconductor: "true", partNumber: "IC-0399" })
    ).toBe(true)
    expect(
      deriveHasDatasheet({ isSemiconductor: "true", mpn: "NE555" })
    ).toBe(true)
    // non-semi without URL never
    expect(
      deriveHasDatasheet({ isSemiconductor: "false", partNumber: "MOD-1" })
    ).toBe(false)
    // semi without identifier never
    expect(
      deriveHasDatasheet({ isSemiconductor: "true" })
    ).toBe(false)
  })
})

describe("buildPlans spec layer (Phase 3)", () => {
  const row = (): SalesRow => ({
    pid: "p1",
    name: "Resistor",
    variationId: "v1",
    variationName: "10K",
    parentSku: "RES-0001",
    price: 1000,
    stock: 5,
    weightGrams: null,
  })
  const media = (): Map<string, MediaEntry> =>
    new Map([
      [
        "p1",
        {
          category: "Resistors",
          categoryPath: "Elektronik/Resistor",
          leaf: "Resistors",
          images: [],
        },
      ],
    ])

  it("attaches family, specs, and datasheet flag to the plan", () => {
    const { plans } = buildPlans([row()], new Map(), media(), false)
    expect(plans[0].specFamily).toBe("resistor")
    expect(plans[0].specs).toEqual({ spec_resistance: "10K" })
    // RES- prefix is a semiconductor + SKU-derived part_number exists
    expect(plans[0].hasDatasheet).toBe(true)
  })
})

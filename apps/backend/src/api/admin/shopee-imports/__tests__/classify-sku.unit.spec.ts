import { classifySku } from "../engine"

// The prefix rule shared by the importer AND the product-classify
// subscriber — one rule on every entry path.
describe("classifySku (shared semiconductor rule)", () => {
  it("flags known semiconductor prefixes", () => {
    expect(classifySku("IC-0399")).toEqual({
      partNumber: "IC-0399",
      isSemiconductor: "true",
    })
    expect(classifySku("TRS-0051")).toEqual({
      partNumber: "TRS-0051",
      isSemiconductor: "true",
    })
    expect(classifySku("MOS-1234")).toEqual({
      partNumber: "MOS-1234",
      isSemiconductor: "true",
    })
  })

  it("reads prefixes case-insensitively (handles are slugs)", () => {
    expect(classifySku("ic-0399-ne555")).toEqual({
      partNumber: "ic-0399-ne555",
      isSemiconductor: "true",
    })
  })

  it("leaves non-semiconductor prefixes false but keeps the part number", () => {
    expect(classifySku("MOD-0501")).toEqual({
      partNumber: "MOD-0501",
      isSemiconductor: "false",
    })
    expect(classifySku("FUS-0001")).toEqual({
      partNumber: "FUS-0001",
      isSemiconductor: "false",
    })
  })

  it("returns null part number for shopee-fallback keys and garbage", () => {
    expect(classifySku("shopee-123")).toEqual({
      partNumber: null,
      isSemiconductor: "false",
    })
    expect(classifySku("")).toEqual({
      partNumber: null,
      isSemiconductor: "false",
    })
    expect(classifySku("My Test Product")).toEqual({
      partNumber: null,
      isSemiconductor: "false",
    })
  })
})

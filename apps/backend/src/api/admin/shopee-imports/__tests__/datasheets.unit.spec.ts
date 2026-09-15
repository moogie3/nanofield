import {
  computeDatasheetPatch,
  describeDatasheetSource,
  extractMpn,
  resolveDatasheetUrl,
} from "../datasheets"
import { buildPlans, type MediaEntry, type SalesRow } from "../engine"

describe("extractMpn (datasheet automation)", () => {
  it("extracts from real live title shapes", () => {
    expect(extractMpn("IC NE555/ NE 555 Chip")).toBe("NE555")
    expect(extractMpn("Transistor TR 2SA1015 / 2SA 1013/ A1013 Chip")).toBe(
      "2SA1015"
    )
    expect(extractMpn("LM7805 5V Voltage Regulator")).toBe("LM7805")
    expect(extractMpn("IRF540N Power MOSFET N-Channel")).toBe("IRF540N")
    expect(extractMpn("Flyback Polytron FCM2015HE")).toBe("FCM2015HE")
    expect(extractMpn("ESP32-WROOM-32 WiFi+BT Module")).toBe("ESP32-WROOM-32")
  })

  it("prefers the longest candidate (full part over fragments)", () => {
    expect(extractMpn("Transistor TR K2488 2SK2488 Power N-MOSFET Chip")).toBe(
      "2SK2488"
    )
  })

  it("rejects specs, packages-as-only-hit is longest-wins, and noise", () => {
    expect(extractMpn("Resistor Kapur 5W 0.22 Ohm")).toBe(null)
    expect(extractMpn("Capacitor 104 Ceramic")).toBe(null)
    expect(extractMpn("High Quality Original Chip")).toBe(null)
    expect(extractMpn("Default")).toBe(null)
    expect(extractMpn("")).toBe(null)
    expect(extractMpn(undefined)).toBe(null)
  })
})

describe("resolveDatasheetUrl + describeDatasheetSource", () => {
  it("misses unknown MPNs (search fallback, never a guess)", () => {
    expect(resolveDatasheetUrl("NE555")).toBe(null)
    expect(resolveDatasheetUrl("")).toBe(null)
    expect(resolveDatasheetUrl(null)).toBe(null)
  })

  it("narrates the resolution chain", () => {
    expect(
      describeDatasheetSource({ datasheetUrl: "https://x/y.pdf", mpn: "NE555" })
    ).toBe("manual document")
    expect(describeDatasheetSource({ mpn: "NE555" })).toBe(
      "MPN search for NE555"
    )
    expect(describeDatasheetSource({})).toBe("no datasheet UI")
  })
})

describe("computeDatasheetPatch (one-click bulk)", () => {
  it("fills empty mpn from the title and flags semi+identifier", () => {
    expect(
      computeDatasheetPatch(
        { is_semiconductor: "true", part_number: "IC-0399" },
        "IC NE555/ NE 555 Chip"
      )
    ).toEqual({ mpn: "NE555", has_datasheet: "true" })
  })

  it("resolves curated map URLs without touching mpn", () => {
    expect(
      computeDatasheetPatch(
        { is_semiconductor: "true", mpn: "ESP32-WROOM-32" },
        "ESP32-WROOM-32 WiFi+BT Module"
      )
    ).toEqual({
      datasheet_url:
        "https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf",
      has_datasheet: "true",
    })
  })

  it("never overwrites operator values", () => {
    expect(
      computeDatasheetPatch(
        {
          is_semiconductor: "true",
          mpn: "OPERATOR-MPN",
          datasheet_url: "https://operator.example/x.pdf",
          has_datasheet: "true",
        },
        "IC NE555/ NE 555 Chip"
      )
    ).toBe(null)
  })

  it("returns null when compliant or unresolvable", () => {
    expect(computeDatasheetPatch(null, "Resistor Kapur 5W")).toBe(null)
    expect(
      computeDatasheetPatch({ no_datasheet: "true" }, "IC NE555 Chip")
    ).toEqual({ mpn: "NE555" })
  })
})

describe("buildPlans datasheet automation", () => {
  const row = (name: string): SalesRow => ({
    pid: "p1",
    name,
    variationId: "v1",
    variationName: "Default",
    parentSku: "MOD-0001",
    price: 1000,
    stock: 5,
    weightGrams: null,
  })
  const media = (): Map<string, MediaEntry> =>
    new Map([
      [
        "p1",
        {
          category: "Modules & Boards",
          categoryPath: "Elektronik/Module",
          leaf: "Modules & Boards",
          images: [],
        },
      ],
    ])

  it("extracts MPN candidates and resolves curated URLs", () => {
    const { plans, mpnFilled, datasheetsLinked } = buildPlans(
      [row("ESP32-WROOM-32 WiFi+BT Module")],
      new Map(),
      media(),
      false
    )
    expect(plans[0].mpnCandidate).toBe("ESP32-WROOM-32")
    expect(plans[0].datasheetUrl).toContain("espressif.com")
    expect(mpnFilled).toBe(1)
    expect(datasheetsLinked).toBe(1)
  })

  it("leaves non-MPN names empty", () => {
    const { plans, mpnFilled, datasheetsLinked } = buildPlans(
      [row("Resistor Kapur 5W")],
      new Map(),
      media(),
      false
    )
    expect(plans[0].mpnCandidate).toBe(null)
    expect(plans[0].datasheetUrl).toBe(null)
    expect(mpnFilled).toBe(0)
    expect(datasheetsLinked).toBe(0)
  })
})

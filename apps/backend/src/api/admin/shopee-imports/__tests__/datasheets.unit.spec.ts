import {
  describeDatasheetSource,
  extractMpn,
  resolveDatasheetUrl,
} from "../datasheets"

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

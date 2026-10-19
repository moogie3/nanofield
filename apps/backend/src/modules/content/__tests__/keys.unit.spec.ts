import {
  CONTENT_KEYS,
  DEFAULT_CONTENT_LOCALE,
  isContentKey,
  isContentLocale,
  mergeLocaleSettings,
  resolveContentDefault,
} from "../keys"

describe("mergeLocaleSettings", () => {
  it("overlays non-empty localized values over the defaults", () => {
    const merged = mergeLocaleSettings(
      { "contact.email": "a@id.com", "home.hero.badge": "id badge" },
      { "contact.email": "a@en.com" }
    )
    expect(merged["contact.email"]).toBe("a@en.com")
    expect(merged["home.hero.badge"]).toBe("id badge")
  })

  it("never lets an empty value shadow a default", () => {
    const merged = mergeLocaleSettings(
      { "contact.email": "a@id.com" },
      { "contact.email": "" }
    )
    expect(merged["contact.email"]).toBe("a@id.com")
  })

  it("keeps keys absent from the defaults", () => {
    const merged = mergeLocaleSettings({}, { "footer.tagline": "only en" })
    expect(merged["footer.tagline"]).toBe("only en")
  })

  it("does not mutate its inputs", () => {
    const defaults = { "contact.email": "a@id.com" }
    const localized = { "contact.email": "a@en.com" }
    mergeLocaleSettings(defaults, localized)
    expect(defaults["contact.email"]).toBe("a@id.com")
    expect(localized["contact.email"]).toBe("a@en.com")
  })
})

describe("content key + locale guards", () => {
  it("accepts catalogued keys only", () => {
    expect(isContentKey("contact.whatsapp")).toBe(true)
    expect(isContentKey("home.hero.badge")).toBe(true)
    expect(isContentKey("nope")).toBe(false)
    expect(isContentKey("toString")).toBe(false)
  })

  it("accepts configured locales only", () => {
    expect(isContentLocale("id")).toBe(true)
    expect(isContentLocale("en")).toBe(true)
    expect(isContentLocale("fr")).toBe(false)
  })

  it("falls back to the Indonesian storefront locale", () => {
    expect(DEFAULT_CONTENT_LOCALE).toBe("id")
  })
})

describe("resolveContentDefault", () => {
  it("returns a string default for every locale", () => {
    const def = CONTENT_KEYS["contact.email"]
    expect(resolveContentDefault(def, "id")).toBe("customer-support@nanofield.com")
    expect(resolveContentDefault(def, "en")).toBe("customer-support@nanofield.com")
  })

  it("returns the per-locale default when present", () => {
    const def = CONTENT_KEYS["home.hero.ctaLabel"]
    expect(resolveContentDefault(def, "id")).toBe("Masuk Katalog")
    expect(resolveContentDefault(def, "en")).toBe("Enter Catalog")
  })

  it("falls back to the default locale for an unknown locale", () => {
    const def = CONTENT_KEYS["home.hero.ctaLabel"]
    expect(resolveContentDefault(def, "fr")).toBe("Masuk Katalog")
  })
})

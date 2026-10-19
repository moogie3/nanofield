import { parseContentPageInput, parsePageData } from "../page-input"
import { findRegistryPage, registryFieldKeys } from "../registry"

describe("parseContentPageInput (create)", () => {
  it("requires slug, locale and title", () => {
    expect(() => parseContentPageInput({}, { partial: false })).toThrow(/slug/)
    expect(() =>
      parseContentPageInput({ slug: "about" }, { partial: false })
    ).toThrow(/locale/)
    expect(() =>
      parseContentPageInput({ slug: "about", locale: "id" }, { partial: false })
    ).toThrow(/title/)
  })

  it("normalizes the slug to lowercase and defaults the body/status", () => {
    const input = parseContentPageInput(
      { slug: " About-Us ", locale: "en", title: " About " },
      { partial: false }
    )
    expect(input.slug).toBe("about-us")
    expect(input.locale).toBe("en")
    expect(input.title).toBe("About")
    expect(input.body).toBeUndefined()
    expect(input.status).toBeUndefined()
  })

  it("rejects slugs with spaces, underscores or leading hyphens", () => {
    for (const slug of ["about us", "about_us", "-about", "about-"]) {
      expect(() =>
        parseContentPageInput({ slug, locale: "id", title: "x" }, { partial: false })
      ).toThrow(/slug/)
    }
  })

  it("rejects unknown locales and statuses", () => {
    expect(() =>
      parseContentPageInput({ slug: "x", locale: "fr", title: "x" }, { partial: false })
    ).toThrow(/locale/)
    expect(() =>
      parseContentPageInput(
        { slug: "x", locale: "id", title: "x", status: "live" },
        { partial: false }
      )
    ).toThrow(/status/)
  })

  it("turns blank optional strings into null and clamps lengths", () => {
    const input = parseContentPageInput(
      {
        slug: "x",
        locale: "id",
        title: "x",
        subtitle: "   ",
        seo_title: "",
        body: "a".repeat(25000),
      },
      { partial: false }
    )
    expect(input.subtitle).toBeNull()
    expect(input.seo_title).toBeNull()
    expect((input.body as string).length).toBe(20000)
  })
})

describe("parseContentPageInput (update)", () => {
  it("accepts a partial payload with just the status", () => {
    const input = parseContentPageInput({ status: "draft" }, { partial: true })
    expect(input).toEqual({ status: "draft" })
  })

  it("still validates fields that are present", () => {
    expect(() =>
      parseContentPageInput({ slug: "Bad Slug" }, { partial: true })
    ).toThrow(/slug/)
    expect(() =>
      parseContentPageInput({ status: "nope" }, { partial: true })
    ).toThrow(/status/)
  })

  it("ignores absent optional fields", () => {
    const input = parseContentPageInput({ title: "New" }, { partial: true })
    expect(input).toEqual({ title: "New" })
  })
})

describe("title rules", () => {
  it("omits the title on create for a registry slug", () => {
    const input = parseContentPageInput(
      { slug: "returns", locale: "id" },
      { partial: false }
    )
    expect(input.title).toBe("")
  })

  it("still requires the title on create for a custom slug", () => {
    expect(() =>
      parseContentPageInput({ slug: "about", locale: "id" }, { partial: false })
    ).toThrow(/title/)
  })

  it("accepts a cleared title on PATCH only for a registry slug", () => {
    expect(
      parseContentPageInput({ title: "  " }, { partial: true, existingSlug: "faq" })
        .title
    ).toBe("")
    expect(() =>
      parseContentPageInput({ title: "" }, { partial: true, existingSlug: "about" })
    ).toThrow(/title/)
  })
})

describe("parsePageData", () => {
  const returns = findRegistryPage("returns")
  const faq = findRegistryPage("faq")

  it("clears the column for null, undefined and all-empty payloads", () => {
    expect(parsePageData(null, { page: returns })).toBeNull()
    expect(parsePageData(undefined, { page: returns })).toBeNull()
    expect(parsePageData({}, { page: returns })).toBeNull()
    expect(
      parsePageData(
        { conditionsTitle: "   ", steps: [], conditions: ["  ", ""] },
        { page: returns }
      )
    ).toBeNull()
  })

  it("rejects payloads that are not JSON objects", () => {
    for (const value of ["text", 5, true, ["a"]]) {
      expect(() => parsePageData(value, { page: returns })).toThrow(
        /JSON object/
      )
    }
  })

  it("prunes empty strings and whitespace inside kept payloads", () => {
    expect(
      parsePageData(
        { waBody: "  hello  ", emailSubject: "", channelsTitle: "\n\t" },
        { page: returns }
      )
    ).toEqual({ waBody: "hello" })
  })

  it("trims simple-list items and drops empty ones", () => {
    expect(
      parsePageData(
        { conditions: [" first ", "", "   ", "second"] },
        { page: returns }
      )
    ).toEqual({ conditions: ["first", "second"] })
  })

  it("rejects unknown top-level keys and lists the allowed ones", () => {
    expect(() => parsePageData({ bogus: "x" }, { page: returns })).toThrow(
      /unknown data key "bogus"/
    )
    expect(() => parsePageData({ bogus: "x" }, { page: returns })).toThrow(
      new RegExp(registryFieldKeys(returns!).join(", "))
    )
    expect(() => parsePageData({ steps: [] }, { page: faq })).not.toThrow()
    expect(() =>
      parsePageData({ steps: [{ title: "x" }] }, { page: faq })
    ).toThrow(/unknown data key "steps"/)
  })

  it("clamps scalar strings to the field's maxLength", () => {
    const out = parsePageData(
      { conditionsTitle: "a".repeat(500) },
      { page: returns }
    )
    expect((out!.conditionsTitle as string).length).toBe(120)
  })

  it("rejects non-string scalars", () => {
    for (const value of [5, true, ["x"], { a: 1 }]) {
      expect(() =>
        parsePageData({ conditionsTitle: value }, { page: returns })
      ).toThrow(/conditionsTitle must be a string/)
    }
  })

  it("clamps lists to maxItems", () => {
    const items = Array.from({ length: 20 }, (_, i) => `point ${i}`)
    const out = parsePageData({ conditions: items }, { page: returns })
    expect(out!.conditions).toHaveLength(12)
  })

  it("rejects wrong list shapes", () => {
    expect(() => parsePageData({ conditions: "nope" }, { page: returns })).toThrow(
      /conditions must be an array/
    )
    expect(() =>
      parsePageData({ conditions: ["ok", 5] }, { page: returns })
    ).toThrow(/conditions\[1\] must be a string/)
    expect(() =>
      parsePageData({ steps: ["not an object"] }, { page: returns })
    ).toThrow(/steps\[0\] must be an object/)
    expect(() =>
      parsePageData({ steps: [{ title: "t", bogus: "x" }] }, { page: returns })
    ).toThrow(/unknown data key "steps\[0\].bogus"/)
  })

  it("keeps valid object-list items keyed by field key", () => {
    const out = parsePageData(
      { steps: [{ title: "Step 1", body: "Details" }] },
      { page: returns }
    )
    expect(out!.steps).toEqual([{ title: "Step 1", body: "Details" }])
  })

  it("validates nested lists deeply (FAQ sections > items)", () => {
    const out = parsePageData(
      {
        sections: [
          { heading: "Shipping", items: [{ q: "When?", a: "Soon" }] },
        ],
      },
      { page: faq }
    )
    expect(out!.sections).toEqual([
      { heading: "Shipping", items: [{ q: "When?", a: "Soon" }] },
    ])
    expect(() =>
      parsePageData(
        { sections: [{ heading: "x", items: [{ q: 5 }] }] },
        { page: faq }
      )
    ).toThrow(/sections\[0\].items\[0\].q must be a string/)
    expect(() =>
      parsePageData(
        { sections: [{ heading: "x", items: "nope" }] },
        { page: faq }
      )
    ).toThrow(/sections\[0\].items must be an array/)
  })

  it("keeps the loose checks when no registry page is known", () => {
    expect(parsePageData({ arbitrary: { nested: "ok" } }, {})).toEqual({
      arbitrary: { nested: "ok" },
    })
    expect(parsePageData({ arbitrary: "x" })).toEqual({ arbitrary: "x" })
  })

  it("rejects oversized payloads by bytes and string length", () => {
    expect(() =>
      parsePageData({ waBody: "a".repeat(100_001) }, {})
    ).toThrow(/bytes/)
    expect(() => parsePageData({ waBody: "a".repeat(10_001) }, {})).toThrow(
      /10000 characters/
    )
    expect(() =>
      parsePageData({ a: { b: { c: { d: { e: { f: { g: "1" } } } } } } }, {})
    ).toThrow(/nesting depth/)
  })
})

describe("parseContentPageInput data", () => {
  it("validates a create payload against the slug's registry", () => {
    const input = parseContentPageInput(
      {
        slug: "faq",
        locale: "id",
        title: "",
        data: { sections: [{ heading: "A", items: [{ q: "Q?", a: "A." }] }] },
      },
      { partial: false }
    )
    expect(input.data).toEqual({
      sections: [{ heading: "A", items: [{ q: "Q?", a: "A." }] }],
    })
    expect(() =>
      parseContentPageInput(
        {
          slug: "faq",
          locale: "id",
          title: "",
          data: { steps: [{ title: "x" }] },
        },
        { partial: false }
      )
    ).toThrow(/unknown data key "steps"/)
  })

  it("validates a data-only PATCH against the row's slug", () => {
    expect(() =>
      parseContentPageInput(
        { data: { bogus: "x" } },
        { partial: true, existingSlug: "returns" }
      )
    ).toThrow(/unknown data key "bogus"/)
    const input = parseContentPageInput(
      { data: { waCta: "Chat now" } },
      { partial: true, existingSlug: "returns" }
    )
    expect(input.data).toEqual({ waCta: "Chat now" })
  })

  it("keeps loose data checks for custom and unknown pages", () => {
    const input = parseContentPageInput(
      { data: { anything: [1, 2] } },
      { partial: true, existingSlug: "about" }
    )
    expect(input.data).toEqual({ anything: [1, 2] })
  })

  it("clears the column when data is sent as null", () => {
    const input = parseContentPageInput(
      { data: null },
      { partial: true, existingSlug: "returns" }
    )
    expect(input.data).toBeNull()
  })
})

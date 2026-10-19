import type { ContentPageRow } from "../resolve"
import { listPublishedPages, pickContentPage } from "../store-pages"

const page = (
  slug: string,
  locale: string,
  status = "published"
): ContentPageRow => ({
  id: `${slug}-${locale}`,
  slug,
  locale,
  title: `${slug} ${locale}`,
  subtitle: null,
  body: "",
  data: null,
  status,
  seo_title: null,
  seo_description: null,
})

describe("pickContentPage", () => {
  it("prefers the requested locale", () => {
    const rows = [page("about", "id"), page("about", "en")]
    expect(pickContentPage(rows, "about", "en")?.locale).toBe("en")
  })

  it("falls back to the default locale when the translation is missing", () => {
    const rows = [page("about", "id")]
    expect(pickContentPage(rows, "about", "en")?.locale).toBe("id")
  })

  it("hides the page when the requested variant is unpublished", () => {
    const rows = [page("about", "id"), page("about", "en", "draft")]
    expect(pickContentPage(rows, "about", "en")).toBeNull()
    // ...but the default locale still serves its published variant.
    expect(pickContentPage(rows, "about", "id")?.locale).toBe("id")
  })

  it("returns null for an unknown slug", () => {
    expect(pickContentPage([page("about", "id")], "nope", "id")).toBeNull()
  })

  it("treats a missing status as published", () => {
    const rows = [{ ...page("about", "id"), status: "" }]
    expect(pickContentPage(rows, "about", "id")).not.toBeNull()
  })
})

describe("listPublishedPages", () => {
  it("resolves every slug for the locale, sorted, skipping hidden ones", () => {
    const rows = [
      page("zeta", "id"),
      page("alpha", "id"),
      page("alpha", "en"),
      page("mid", "id", "draft"),
    ]
    const listed = listPublishedPages(rows, "en")
    expect(listed.map((p) => p.slug)).toEqual(["alpha", "zeta"])
    expect(listed[0].locale).toBe("en")
    expect(listed[1].locale).toBe("id")
  })
})

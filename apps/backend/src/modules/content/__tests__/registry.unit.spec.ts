import fs from "fs"
import path from "path"
import {
  CONTENT_PAGE_REGISTRY,
  findRegistryField,
  findRegistryPage,
  isSimpleList,
  registryFieldKeys,
  type RegistryField,
  type RegistryPage,
} from "../registry"

const PAGE_DATA_MAX_STRING = 10_000

const walkFields = (
  page: RegistryPage,
  visit: (field: RegistryField, path: string) => void,
  prefix = ""
): void => {
  for (const section of page.sections) {
    for (const field of section.fields) {
      visit(field, `${prefix}${field.key}`)
      if (field.kind === "list") {
        for (const itemField of field.itemFields) {
          visit(itemField, `${prefix}${field.key}.${itemField.key}`)
          if (itemField.kind === "list") {
            for (const nested of itemField.itemFields) {
              visit(nested, `${prefix}${field.key}.${itemField.key}.${nested.key}`)
            }
          }
        }
      }
    }
  }
}

describe("content page registry", () => {
  it("has unique slugs and root paths", () => {
    const slugs = CONTENT_PAGE_REGISTRY.map((p) => p.slug)
    const paths = CONTENT_PAGE_REGISTRY.map((p) => p.path)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(new Set(paths).size).toBe(paths.length)
    for (const page of CONTENT_PAGE_REGISTRY) {
      expect(page.label.length).toBeGreaterThan(0)
      expect(page.path).toMatch(/^\/[a-z0-9-]+$/)
      expect(page.sections.length).toBeGreaterThan(0)
    }
  })

  it("has unique, non-empty field keys with sane bounds", () => {
    for (const page of CONTENT_PAGE_REGISTRY) {
      const keys = registryFieldKeys(page)
      expect(keys.length).toBeGreaterThan(0)
      expect(new Set(keys).size).toBe(keys.length)
      walkFields(page, (field, fieldPath) => {
        expect(field.key).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/)
        expect(field.label.length).toBeGreaterThan(0)
        if (field.kind === "list") {
          expect(field.maxItems).toBeGreaterThan(0)
          expect(field.itemFields.length).toBeGreaterThan(0)
          const itemKeys = field.itemFields.map((item) => item.key)
          expect(new Set(itemKeys).size).toBe(itemKeys.length)
        } else {
          expect(field.maxLength).toBeGreaterThan(0)
          expect(field.maxLength).toBeLessThanOrEqual(PAGE_DATA_MAX_STRING)
        }
      })
    }
  })

  it("classifies simple lists (plain strings) vs object lists", () => {
    const returns = findRegistryPage("returns")!
    const faq = findRegistryPage("faq")!
    const asList = (field: RegistryField | null) => {
      expect(field?.kind).toBe("list")
      return field as Extract<RegistryField, { kind: "list" }>
    }
    expect(isSimpleList(asList(findRegistryField(returns, "conditions")))).toBe(true)
    expect(isSimpleList(asList(findRegistryField(returns, "steps")))).toBe(false)
    expect(isSimpleList(asList(findRegistryField(faq, "sections")))).toBe(false)
  })

  it("finds pages and fields, including nested list item fields", () => {
    expect(findRegistryPage("about")).toBeNull()
    expect(findRegistryPage("nope")).toBeNull()
    const faq = findRegistryPage("faq")!
    expect(findRegistryField(faq, "nope")).toBeNull()
    const sections = findRegistryField(faq, "sections")
    expect(sections?.kind).toBe("list")
    expect(sections?.kind === "list" && sections.itemFields.map((f) => f.key)).toEqual([
      "heading",
      "items",
    ])
  })

  // Every structured key the renderers read must be a registry field, and every
  // registry field must be read by its renderer — otherwise the admin edits a
  // key nobody renders (dead field) or the renderer reads a key nobody can set.
  it.each([
    ["returns", ["app", "[locale]", "[countryCode]", "(main)", "returns", "page.tsx"]],
    ["faq", ["app", "[locale]", "[countryCode]", "(main)", "faq", "page.tsx"]],
    ["contact", ["app", "[locale]", "[countryCode]", "(main)", "contact", "page.tsx"]],
  ])("keeps %s registry fields in sync with the storefront renderer", (slug, fileSegments) => {
    const appsDir = path.resolve(__dirname, "..", "..", "..", "..", "..")
    const rendererPath = path.join(
      appsDir,
      "storefront",
      "src",
      ...fileSegments
    )
    if (!fs.existsSync(rendererPath)) {
      // apps/storefront is optional in this monorepo; nothing to sync against.
      return
    }
    const source = fs.readFileSync(rendererPath, "utf8")
    const rendered = new Set<string>()
    for (const match of source.matchAll(/d\?\.([A-Za-z][A-Za-z0-9]*)/g)) {
      rendered.add(match[1])
    }
    const page = findRegistryPage(slug)!
    const registered = new Set(registryFieldKeys(page))
    expect([...rendered].filter((key) => !registered.has(key))).toEqual([])
    expect([...registered].filter((key) => !rendered.has(key))).toEqual([])
  })

  // Each field must have shipped fallback copy in both locales, or the page
  // would go blank when the CMS value is empty.
  it.each([["returns"], ["faq"], ["contact"]])(
    "has en+id fallback copy for every %s field",
    (slug) => {
      const appsDir = path.resolve(__dirname, "..", "..", "..", "..", "..")
      const messagesPath = path.join(appsDir, "storefront", "src", "messages")
      if (!fs.existsSync(messagesPath)) {
        return
      }
      const page = findRegistryPage(slug)!
      for (const locale of ["en", "id"]) {
        const messages = JSON.parse(
          fs.readFileSync(path.join(messagesPath, `${locale}.json`), "utf8")
        )
        const dict = messages?.support?.[slug]
        expect(dict).toBeDefined()
        for (const key of registryFieldKeys(page)) {
          expect(Object.keys(dict)).toContain(key)
        }
      }
    }
  )
})

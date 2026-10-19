import { MedusaError } from "@medusajs/framework/utils"
import { CONTENT_LOCALES, isContentLocale } from "./keys"
import {
  findRegistryField,
  findRegistryPage,
  isSimpleList,
  registryFieldKeys,
  type RegistryField,
  type RegistryPage,
} from "./registry"

// Storefront page slug: lowercase letters, numbers, single hyphens.
export const CONTENT_PAGE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const CONTENT_PAGE_STATUSES = ["draft", "published"] as const

// Safety caps for the data JSON column: the admin form enforces per-field
// limits; these are the last line of defense against a hand-crafted payload.
export const PAGE_DATA_MAX_BYTES = 100_000
export const PAGE_DATA_MAX_DEPTH = 6
export const PAGE_DATA_MAX_STRING = 10_000

export type ContentPageInput = {
  slug?: string
  locale?: string
  title?: string
  subtitle?: string | null
  body?: string
  data?: Record<string, unknown> | null
  status?: string
  seo_title?: string | null
  seo_description?: string | null
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const checkDataNode = (value: unknown, depth: number): void => {
  if (depth > PAGE_DATA_MAX_DEPTH) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `data exceeds the maximum nesting depth of ${PAGE_DATA_MAX_DEPTH}`
    )
  }
  if (typeof value === "string") {
    if (value.length > PAGE_DATA_MAX_STRING) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `data strings must be at most ${PAGE_DATA_MAX_STRING} characters`
      )
    }
    return
  }
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => checkDataNode(item, depth + 1))
    return
  }
  if (isPlainObject(value)) {
    for (const child of Object.values(value)) {
      checkDataNode(child, depth + 1)
    }
    return
  }
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "data must only contain strings, numbers, booleans, arrays and objects"
  )
}

// Drops values that mean "no override": empty/whitespace-only strings, nulls,
// empty arrays, and objects that are empty (or become empty after pruning
// their children). Without this, a cleared admin field would store "" (or
// "   ") and defeat the storefront's `data?.field ?? i18n` fallback, blanking
// the page section. Strings are trimmed, matching the scalar columns.
const pruneEmpty = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return undefined
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }
  if (Array.isArray(value)) {
    const items = value.map(pruneEmpty).filter((v) => v !== undefined)
    return items.length ? items : undefined
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      const pruned = pruneEmpty(child)
      if (pruned !== undefined) {
        out[key] = pruned
      }
    }
    return Object.keys(out).length ? out : undefined
  }
  return value
}

// Validates and normalizes one value against its registry field definition:
// scalars must be strings (clamped to the field's maxLength), lists must be
// arrays (clamped to maxItems) whose items match itemFields — recursively, so
// nested lists like FAQ sections' Q&A items are checked too. Throws
// INVALID_DATA naming the path of the offending value, so a hand-crafted
// payload can never store a shape the storefront renderers would choke on.
const validateFieldValue = (
  field: RegistryField,
  value: unknown,
  path: string
): unknown => {
  if (field.kind !== "list") {
    if (typeof value !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${path} must be a string`
      )
    }
    return value.slice(0, field.maxLength)
  }
  if (!Array.isArray(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${path} must be an array (up to ${field.maxItems} items)`
    )
  }
  const items = value.slice(0, field.maxItems)
  if (isSimpleList(field)) {
    const itemField = field.itemFields[0]
    if (itemField.kind === "list") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${path} has an unsupported item field`
      )
    }
    return items.map((entry, index) => {
      if (typeof entry !== "string") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${path}[${index}] must be a string`
        )
      }
      return entry.slice(0, itemField.maxLength)
    })
  }
  return items.map((entry, index) => {
    const itemPath = `${path}[${index}]`
    if (!isPlainObject(entry)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${itemPath} must be an object`
      )
    }
    for (const key of Object.keys(entry)) {
      if (!field.itemFields.some((itemField) => itemField.key === key)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `unknown data key "${itemPath}.${key}"`
        )
      }
    }
    const out: Record<string, unknown> = {}
    for (const itemField of field.itemFields) {
      const child = entry[itemField.key]
      if (child !== undefined) {
        out[itemField.key] = validateFieldValue(
          itemField,
          child,
          `${itemPath}.${itemField.key}`
        )
      }
    }
    return out
  })
}

// Validates the structured (registry) page payload stored in the data column.
// Accepts null (clears the column) or a plain JSON object. Empty values are
// pruned first, so an all-empty payload becomes null (fully back to i18n).
// When the page's registry is known, every key and value is checked against
// the field definitions (deeply, for lists), so a typo or wrong shape never
// silently stores dead data. Pure, so the rules are unit-testable.
export const parsePageData = (
  value: unknown,
  { page }: { page?: RegistryPage | null } = {}
): Record<string, unknown> | null => {
  if (value === null || value === undefined) {
    return null
  }
  if (!isPlainObject(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "data must be a JSON object"
    )
  }
  const pruned = pruneEmpty(value)
  if (!isPlainObject(pruned)) {
    return null
  }
  const size = JSON.stringify(pruned)?.length ?? 0
  if (size > PAGE_DATA_MAX_BYTES) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `data must be at most ${PAGE_DATA_MAX_BYTES} bytes`
    )
  }
  checkDataNode(pruned, 0)
  if (!page) {
    // Custom pages and slug-less PATCHes: no form schema to check against.
    // Unknown keys are harmless there — the renderers only read known ones.
    return pruned
  }
  const allowedKeys = registryFieldKeys(page)
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(pruned)) {
    const field = findRegistryField(page, key)
    if (!field) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `unknown data key "${key}" (allowed: ${allowedKeys.join(", ")})`
      )
    }
    out[key] = validateFieldValue(field, child, key)
  }
  return out
}

// Validates and normalizes a page create/update payload. On create (partial
// false) slug, locale and title are required. On update (partial true) only the
// provided fields are validated — so a PATCH can flip just `status`, etc.
// `existingSlug` is the row's current slug, so a payload that omits slug
// (common on PATCH) still resolves its registry rules (optional title,
// data shape). Returns a clean object safe to hand to the module service.
export const parseContentPageInput = (
  body: Record<string, unknown>,
  { partial, existingSlug }: { partial: boolean; existingSlug?: string }
): ContentPageInput => {
  const out: ContentPageInput = {}
  const has = (key: string) => body[key] !== undefined

  if (has("slug")) {
    const slug = String(body.slug ?? "")
      .trim()
      .toLowerCase()
    if (!CONTENT_PAGE_SLUG_RE.test(slug)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "slug must be lowercase letters, numbers and hyphens (e.g. about-us)"
      )
    }
    out.slug = slug
  } else if (!partial) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "slug is required")
  }
  const registrySlug = out.slug ?? existingSlug

  if (has("locale")) {
    const locale = String(body.locale ?? "")
    if (!isContentLocale(locale)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `locale must be one of: ${CONTENT_LOCALES.join(", ")}`
      )
    }
    out.locale = locale
  } else if (!partial) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "locale is required")
  }

  // Registry pages carry their titles in the storefront dictionary, so the
  // title may be omitted on create (stored empty; the storefront then shows
  // the i18n default for the viewer's locale). Custom pages require one,
  // since /pages/<slug> renders the row's title verbatim.
  const registryTitleOptional = !!(registrySlug && findRegistryPage(registrySlug))
  if (has("title")) {
    const title = String(body.title ?? "")
      .trim()
      .slice(0, 200)
    if (!title && !registryTitleOptional) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "title is required")
    }
    out.title = title
  } else if (!partial) {
    if (!registryTitleOptional) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "title is required")
    }
    out.title = ""
  }

  if (has("subtitle")) {
    out.subtitle = String(body.subtitle ?? "").trim().slice(0, 300) || null
  }
  if (has("body")) {
    out.body = String(body.body ?? "").slice(0, 20000)
  }
  if (has("data")) {
    // The effective slug is the payload's, falling back to the existing row's
    // (PATCH can omit it), so data is always validated against the right
    // registry. Slug-less POST/PATCH against an unknown page keeps the loose
    // checks: unknown keys are ignored by the renderers, so it stays harmless.
    const registry = findRegistryPage(registrySlug ?? "")
    out.data = parsePageData(body.data, { page: registry })
  }
  if (has("status")) {
    const status = String(body.status ?? "")
    if (!(CONTENT_PAGE_STATUSES as readonly string[]).includes(status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `status must be one of: ${CONTENT_PAGE_STATUSES.join(", ")}`
      )
    }
    out.status = status
  }
  if (has("seo_title")) {
    out.seo_title = String(body.seo_title ?? "").trim().slice(0, 200) || null
  }
  if (has("seo_description")) {
    out.seo_description =
      String(body.seo_description ?? "").trim().slice(0, 300) || null
  }

  return out
}

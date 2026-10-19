import { DEFAULT_CONTENT_LOCALE } from "./keys"
import type { ContentPageRow } from "./resolve"

type Variants = Record<string, ContentPageRow>

const groupBySlug = (rows: ContentPageRow[]): Map<string, Variants> => {
  const bySlug = new Map<string, Variants>()
  for (const row of rows) {
    const variants = bySlug.get(row.slug) ?? {}
    variants[row.locale] = row
    bySlug.set(row.slug, variants)
  }
  return bySlug
}

// Resolves one slug for a locale: the requested locale's variant wins, the
// default locale's variant is the fallback, and a variant that exists but is
// not published hides the page for that locale (so unpublishing a translation
// does not silently resurrect the default-language text). Pure, so the
// fallback + published rules can be tested without a database.
export const pickContentPage = (
  rows: ContentPageRow[],
  slug: string,
  locale: string,
  fallback = DEFAULT_CONTENT_LOCALE
): ContentPageRow | null => {
  const variants = groupBySlug(rows).get(slug)
  if (!variants) {
    return null
  }
  const row = variants[locale] ?? variants[fallback]
  if (!row || (row.status || "published") !== "published") {
    return null
  }
  return row
}

// Every published page resolvable for a locale, slug order.
export const listPublishedPages = (
  rows: ContentPageRow[],
  locale: string,
  fallback = DEFAULT_CONTENT_LOCALE
): ContentPageRow[] => {
  const slugs = [...groupBySlug(rows).keys()]
  return slugs
    .map((slug) => pickContentPage(rows, slug, locale, fallback))
    .filter((row): row is ContentPageRow => row !== null)
    .sort((a, b) => (a.slug < b.slug ? -1 : 1))
}

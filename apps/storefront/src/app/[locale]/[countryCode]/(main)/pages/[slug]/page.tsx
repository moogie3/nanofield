import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getContentPage } from "@lib/data/content"
import { localizedPageMeta } from "@lib/util/locale-metadata"
import ContentBlocks from "@modules/common/components/content-blocks"
import PageHeader from "@modules/common/components/page-header"

type PageParams = {
  locale: string
  countryCode: string
  slug: string
}

// Long-form pages authored in the admin (Content -> Pages). The backend already
// applies the locale fallback and the published filter, so a miss means the page
// does not exist (404) — there is no built-in fallback copy here, unlike the
// faq/returns pages which keep their in-code content until a CMS page overrides
// them.
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>
}): Promise<Metadata> {
  const { locale, countryCode, slug } = await params
  const page = await getContentPage(slug, locale)
  if (!page) {
    return {}
  }
  return localizedPageMeta(
    `/${countryCode}/pages/${slug}`,
    page.seo_title || page.title,
    page.seo_description || page.subtitle
  )
}

export default async function CmsPage({ params }: { params: Promise<PageParams> }) {
  const { locale, slug } = await params
  const page = await getContentPage(slug, locale)
  if (!page) {
    notFound()
  }

  return (
    <div
      className="content-container py-12 small:py-16"
      data-testid="cms-page"
    >
      <PageHeader
        eyebrow={slug.replace(/-/g, " ").toUpperCase()}
        title={page.title}
        subtitle={page.subtitle}
      />
      <div className="mt-10 max-w-3xl">
        <ContentBlocks body={page.body} />
      </div>
    </div>
  )
}

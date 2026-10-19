import { getLocale, getTranslations } from "next-intl/server"
import { pageMeta } from "@lib/util/locale-metadata"
import { Metadata } from "next"

import { getStoreContact } from "@lib/data/store-contact"
import { getContentPage } from "@lib/data/content"
import ContentBlocks from "@modules/common/components/content-blocks"
import { Heading, Text } from "@modules/common/components/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import PageHeader from "@modules/common/components/page-header"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}): Promise<Metadata> {
  const { locale, countryCode } = await params
  return pageMeta(locale, countryCode, "/faq", "faqTitle", "faqDesc")
}

type FaqSection = { heading: string; items: { q: string; a: string }[] }

// Structured copy authored in the admin (Content -> Pages, "FAQ" form; see
// backend modules/content/registry.ts). Every field falls back to the i18n
// copy below, so a missing key keeps the shipped text and the page can never
// go blank.
type FaqData = {
  sections?: FaqSection[]
  stillTitle?: string
  stillBody?: string
  contactCta?: string
  returnsCta?: string
}

export default async function FaqPage() {
  const t = await getTranslations("support.faq")
  const locale = await getLocale()
  const contact = await getStoreContact(locale)
  const cms = await getContentPage("faq", locale)
  const d = (cms?.data ?? null) as FaqData | null
  // Structured content lives in messages/{locale}.json so the whole FAQ
  // (all Q&As) is translated, not just the chrome. {address} is injected
  // here since it comes from the store config, not the dictionary. The admin
  // override goes through the same replacement. The CMS array only wins when
  // it really is an array, and every string is type-checked, so a malformed
  // row (hand-edited DB) degrades to blank fields instead of crashing.
  const i18nSections = t.raw("sections") as FaqSection[]
  const sections = (
    Array.isArray(d?.sections) ? d.sections : i18nSections
  ).map((section) => ({
    heading: typeof section.heading === "string" ? section.heading : "",
    items: (Array.isArray(section.items) ? section.items : []).map((faq) => ({
      q: typeof faq.q === "string" ? faq.q : "",
      a:
        typeof faq.a === "string"
          ? faq.a.replace("{address}", contact.address)
          : "",
    })),
  }))
  const stillTitle = d?.stillTitle ?? t("stillTitle")
  const stillBody = d?.stillBody ?? t("stillBody")
  const contactCta = d?.contactCta ?? t("contactCta")
  const returnsCta = d?.returnsCta ?? t("returnsCta")
  // A legacy plain-body override (published before structured data existed)
  // still renders through the generic block renderer.
  const legacyBody = cms?.body && !d ? cms.body : null

  return (
    <div className="content-container py-12 small:py-16" data-testid="faq-page">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={cms?.title || t("title")}
        subtitle={cms?.subtitle || t("subtitle")}
      />
      {legacyBody ? (
        <div className="mt-10 max-w-3xl">
          <ContentBlocks body={legacyBody} />
        </div>
      ) : (
        sections.map((section, sectionIndex) => (
          <div key={section.heading || `section-${sectionIndex}`} className="mt-10">
            <Heading level="h2" className="text-xl-semi">
              {section.heading}
            </Heading>
            <div className="mt-4 flex flex-col gap-4">
              {section.items.map((faq, faqIndex) => (
                <div
                  key={faq.q || `faq-${faqIndex}`}
                  className="bg-card border border-border rounded-2xl p-6"
                >
                  <Heading level="h3" className="text-base-semi">
                    {faq.q}
                  </Heading>
                  <Text className="text-small-regular mt-2 text-ui-fg-subtle">
                    {faq.a}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      <div className="mt-12 bg-card border border-border rounded-2xl p-6 small:p-8">
        <Heading level="h2" className="text-xl-semi">
          {stillTitle}
        </Heading>
        <Text className="text-small-regular mt-2 text-ui-fg-subtle">
          {stillBody}
        </Text>
        <div className="mt-4 flex flex-col gap-4 small:flex-row small:items-center">
          <InteractiveLink href="/contact">{contactCta}</InteractiveLink>
          <InteractiveLink href="/returns">{returnsCta}</InteractiveLink>
        </div>
      </div>
    </div>
  )
}

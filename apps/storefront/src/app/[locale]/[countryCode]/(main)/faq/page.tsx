import { getTranslations } from "next-intl/server"
import { pageMeta } from "@lib/util/locale-metadata"
import { Metadata } from "next"

import { STORE_CONTACT } from "@lib/store-contact"
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

export default async function FaqPage() {
  const t = await getTranslations("support.faq")
  // Structured content lives in messages/{locale}.json so the whole FAQ
  // (all Q&As) is translated, not just the chrome. {address} is injected
  // here since it comes from the store config, not the dictionary.
  const sections = (
    t.raw("sections") as FaqSection[]
  ).map((section) => ({
    ...section,
    items: section.items.map((faq) => ({
      ...faq,
      a: faq.a.replace("{address}", STORE_CONTACT.address),
    })),
  }))

  return (
    <div className="content-container py-12 small:py-16" data-testid="faq-page">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      {sections.map((section) => (
        <div key={section.heading} className="mt-10">
          <Heading level="h2" className="text-xl-semi">
            {section.heading}
          </Heading>
          <div className="mt-4 flex flex-col gap-4">
            {section.items.map((faq) => (
              <div
                key={faq.q}
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
      ))}
      <div className="mt-12 bg-card border border-border rounded-2xl p-6 small:p-8">
        <Heading level="h2" className="text-xl-semi">
          {t("stillTitle")}
        </Heading>
        <Text className="text-small-regular mt-2 text-ui-fg-subtle">
          {t("stillBody")}
        </Text>
        <div className="mt-4 flex flex-col gap-4 small:flex-row small:items-center">
          <InteractiveLink href="/contact">{t("contactCta")}</InteractiveLink>
          <InteractiveLink href="/returns">{t("returnsCta")}</InteractiveLink>
        </div>
      </div>
    </div>
  )
}

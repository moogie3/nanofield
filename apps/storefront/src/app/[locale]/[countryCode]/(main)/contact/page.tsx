import { getLocale, getTranslations } from "next-intl/server"
import { pageMeta } from "@lib/util/locale-metadata"
import { Metadata } from "next"

import { getStoreContact } from "@lib/data/store-contact"
import { getContentPage } from "@lib/data/content"
import { mapsUrl, emailUrl, whatsappUrl } from "@lib/store-contact"
import { Heading, Text } from "@modules/common/components/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import PageHeader from "@modules/common/components/page-header"
import { ArrowUpRightMini } from "@medusajs/icons"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}): Promise<Metadata> {
  const { locale, countryCode } = await params
  return pageMeta(
    locale,
    countryCode,
    "/contact",
    "contactTitle",
    "contactDesc"
  )
}

// Structured copy authored in the admin (Content -> Pages, "Contact" form;
// see backend modules/content/registry.ts). Every field falls back to the
// i18n copy below, so a missing key keeps the shipped text. The contact
// values themselves (address/email/WhatsApp) come from the admin Settings.
type ContactData = {
  chatTitle?: string
  chatBody?: string
  chatCta?: string
  emailTitle?: string
  emailBody?: string
  visitTitle?: string
  mapsCta?: string
  backFaq?: string
}

export default async function ContactPage() {
  const t = await getTranslations("support.contact")
  const locale = await getLocale()
  const contact = await getStoreContact(locale)
  const cms = await getContentPage("contact", locale)
  const d = (cms?.data ?? null) as ContactData | null
  const chatTitle = d?.chatTitle ?? t("chatTitle")
  const chatBody = d?.chatBody ?? t("chatBody")
  const chatCta = d?.chatCta ?? t("chatCta")
  const emailTitle = d?.emailTitle ?? t("emailTitle")
  const emailBody = d?.emailBody ?? t("emailBody")
  const visitTitle = d?.visitTitle ?? t("visitTitle")
  const mapsCta = d?.mapsCta ?? t("mapsCta")
  const backFaq = d?.backFaq ?? t("backFaq")
  return (
    <div
      className="content-container py-12 small:py-16"
      data-testid="contact-page"
    >
      <PageHeader
        eyebrow={t("eyebrow")}
        title={cms?.title || t("title")}
        subtitle={cms?.subtitle || t("subtitle")}
      />
      <div className="mt-8 grid gap-4 small:grid-cols-3">
        <div
          className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-3"
          data-testid="contact-whatsapp"
        >
          <Heading level="h2" className="text-large-semi">
            {chatTitle}
          </Heading>
          <Text className="text-small-regular text-ui-fg-subtle">
            {chatBody}
          </Text>
          <a
            className="flex gap-x-1 items-center group w-fit"
            href={whatsappUrl(contact)}
            target="_blank"
            rel="noreferrer"
          >
            <Text className="text-ui-fg-interactive">{chatCta}</Text>
            <ArrowUpRightMini
              className="group-hover:rotate-45 ease-in-out duration-150"
              color="var(--fg-interactive)"
            />
          </a>
        </div>
        <div
          className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-3"
          data-testid="contact-call"
        >
          <Heading level="h2" className="text-large-semi">
            {emailTitle}
          </Heading>
          <Text className="text-small-regular text-ui-fg-subtle">
            {emailBody}
          </Text>
          <a
            className="flex gap-x-1 items-center group w-fit"
            href={emailUrl(contact)}
          >
            <Text className="text-ui-fg-interactive">
              {contact.email}
            </Text>
            <ArrowUpRightMini
              className="group-hover:rotate-45 ease-in-out duration-150"
              color="var(--fg-interactive)"
            />
          </a>
        </div>
        <div
          className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-3"
          data-testid="contact-visit"
        >
          <Heading level="h2" className="text-large-semi">
            {visitTitle}
          </Heading>
          <Text className="text-small-regular text-ui-fg-subtle">
            {contact.address}
          </Text>
          <a
            className="flex gap-x-1 items-center group w-fit"
            href={mapsUrl(contact)}
            target="_blank"
            rel="noreferrer"
          >
            <Text className="text-ui-fg-interactive">{mapsCta}</Text>
            <ArrowUpRightMini
              className="group-hover:rotate-45 ease-in-out duration-150"
              color="var(--fg-interactive)"
            />
          </a>
        </div>
      </div>
      <div className="mt-8">
        <InteractiveLink href="/faq">{backFaq}</InteractiveLink>
      </div>
    </div>
  )
}

import { getTranslations } from "next-intl/server"
import { pageMeta } from "@lib/util/locale-metadata"
import { Metadata } from "next"

import { mapsUrl, emailUrl, STORE_CONTACT, whatsappUrl } from "@lib/store-contact"
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

export default async function ContactPage() {
  const t = await getTranslations("support.contact")
  return (
    <div
      className="content-container py-12 small:py-16"
      data-testid="contact-page"
    >
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <div className="mt-8 grid gap-4 small:grid-cols-3">
        <div
          className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-3"
          data-testid="contact-whatsapp"
        >
          <Heading level="h2" className="text-large-semi">
            {t("chatTitle")}
          </Heading>
          <Text className="text-small-regular text-ui-fg-subtle">
            {t("chatBody")}
          </Text>
          <a
            className="flex gap-x-1 items-center group w-fit"
            href={whatsappUrl()}
            target="_blank"
            rel="noreferrer"
          >
            <Text className="text-ui-fg-interactive">{t("chatCta")}</Text>
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
            {t("emailTitle")}
          </Heading>
          <Text className="text-small-regular text-ui-fg-subtle">
            {t("emailBody")}
          </Text>
          <a
            className="flex gap-x-1 items-center group w-fit"
            href={emailUrl()}
          >
            <Text className="text-ui-fg-interactive">
              {STORE_CONTACT.email}
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
            {t("visitTitle")}
          </Heading>
          <Text className="text-small-regular text-ui-fg-subtle">
            {STORE_CONTACT.address}
          </Text>
          <a
            className="flex gap-x-1 items-center group w-fit"
            href={mapsUrl()}
            target="_blank"
            rel="noreferrer"
          >
            <Text className="text-ui-fg-interactive">{t("mapsCta")}</Text>
            <ArrowUpRightMini
              className="group-hover:rotate-45 ease-in-out duration-150"
              color="var(--fg-interactive)"
            />
          </a>
        </div>
      </div>
      <div className="mt-8">
        <InteractiveLink href="/faq">{t("backFaq")}</InteractiveLink>
      </div>
    </div>
  )
}

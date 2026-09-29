import { getTranslations } from "next-intl/server"
import { pageMeta } from "@lib/util/locale-metadata"
import { Metadata } from "next"

import { emailUrl, STORE_CONTACT, whatsappUrl } from "@lib/store-contact"
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
    "/returns",
    "returnsTitle",
    "returnsDesc"
  )
}

type ReturnsStep = { title: string; body: string }

export default async function ReturnsPage() {
  const t = await getTranslations("support.returns")
  const steps = t.raw("steps") as ReturnsStep[]
  const conditions = t.raw("conditions") as string[]
  return (
    <div
      className="content-container py-12 small:py-16"
      data-testid="returns-page"
    >
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <div className="mt-8 grid gap-4 small:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.title}
            className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-2"
          >
            <Heading level="h2" className="text-large-semi">
              {step.title}
            </Heading>
            <Text className="text-small-regular text-ui-fg-subtle">
              {step.body}
            </Text>
          </div>
        ))}
      </div>
      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <Heading level="h2" className="text-large-semi">
          {t("conditionsTitle")}
        </Heading>
        <ul className="mt-3 flex flex-col gap-y-2 text-small-regular text-ui-fg-subtle list-disc pl-5">
          {conditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      </div>
      <div className="mt-8">
        <Heading level="h2" className="text-xl-semi">
          {t("channelsTitle")}
        </Heading>
        <div className="mt-4 grid gap-4 small:grid-cols-3">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-2">
            <Heading level="h3" className="text-base-semi">
              WhatsApp
            </Heading>
            <Text className="text-small-regular text-ui-fg-subtle">
              {t("waBody")}
            </Text>
            <a
              className="flex gap-x-1 items-center group w-fit"
              href={whatsappUrl(t("waPrefill"))}
              target="_blank"
              rel="noreferrer"
            >
              <Text className="text-ui-fg-interactive">{t("waCta")}</Text>
              <ArrowUpRightMini
                className="group-hover:rotate-45 ease-in-out duration-150"
                color="var(--fg-interactive)"
              />
            </a>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-2">
            <Heading level="h3" className="text-base-semi">
              Email
            </Heading>
            <Text className="text-small-regular text-ui-fg-subtle">
              {t("emailBody")}
            </Text>
            <a
              className="flex gap-x-1 items-center group w-fit"
              href={emailUrl(t("emailSubject"))}
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
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-2">
            <Heading level="h3" className="text-base-semi">
              {t("visitTitle")}
            </Heading>
            <Text className="text-small-regular text-ui-fg-subtle">
              {t("visitBody", { address: STORE_CONTACT.address })}
            </Text>
            <InteractiveLink href="/contact">
              {t("storeDetails")}
            </InteractiveLink>
          </div>
        </div>
      </div>
      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <Heading level="h2" className="text-large-semi">
          {t("orderIdTitle")}
        </Heading>
        <Text className="text-small-regular mt-2 text-ui-fg-subtle">
          {t("orderIdBody")}
        </Text>
        <div className="mt-4">
          <InteractiveLink href="/account/orders">
            {t("orderIdCta")}
          </InteractiveLink>
        </div>
      </div>
    </div>
  )
}

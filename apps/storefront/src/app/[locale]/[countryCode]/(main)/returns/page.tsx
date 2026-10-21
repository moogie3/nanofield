import { getLocale, getTranslations } from "next-intl/server"
import { pageMeta } from "@lib/util/locale-metadata"
import { Metadata } from "next"

import { getStoreContact } from "@lib/data/store-contact"
import { getContentPage } from "@lib/data/content"
import ContentBlocks from "@modules/common/components/content-blocks"
import { emailUrl, whatsappUrl } from "@lib/store-contact"
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

// Structured copy authored in the admin (Content -> Pages, "Returns &
// Exchanges" form; see backend modules/content/registry.ts). Every field
// falls back to the i18n copy below, so a missing key keeps the shipped text
// and the page can never go blank.
type ReturnsData = {
  steps?: ReturnsStep[]
  conditionsTitle?: string
  conditions?: string[]
  channelsTitle?: string
  waBody?: string
  waCta?: string
  waPrefill?: string
  emailBody?: string
  emailSubject?: string
  visitTitle?: string
  visitBody?: string
  orderIdTitle?: string
  orderIdBody?: string
  orderIdCta?: string
}

export default async function ReturnsPage() {
  const t = await getTranslations("support.returns")
  const locale = await getLocale()
  const contact = await getStoreContact(locale)
  const i18nSteps = t.raw("steps") as ReturnsStep[]
  const i18nConditions = t.raw("conditions") as string[]
  const cms = await getContentPage("returns", locale)
  const d = (cms?.data ?? null) as ReturnsData | null
  // CMS arrays only win when they really are arrays, and every string is
  // type-checked, so a malformed row (hand-edited DB) degrades to blank
  // fields instead of crashing the page.
  const steps = (Array.isArray(d?.steps) ? d.steps : i18nSteps).map((step) => ({
    title: typeof step.title === "string" ? step.title : "",
    body: typeof step.body === "string" ? step.body : "",
  }))
  const conditionsTitle = d?.conditionsTitle ?? t("conditionsTitle")
  const conditions = (Array.isArray(d?.conditions)
    ? d.conditions
    : i18nConditions
  ).filter((condition): condition is string => typeof condition === "string")
  const channelsTitle = d?.channelsTitle ?? t("channelsTitle")
  const waBody = d?.waBody ?? t("waBody")
  const waCta = d?.waCta ?? t("waCta")
  const waPrefill = d?.waPrefill ?? t("waPrefill")
  const emailBody = d?.emailBody ?? t("emailBody")
  const emailSubject = d?.emailSubject ?? t("emailSubject")
  const visitTitle = d?.visitTitle ?? t("visitTitle")
  const visitBody = (
    typeof d?.visitBody === "string"
      ? d.visitBody
      : t("visitBody", { address: contact.address })
  ).replace("{address}", contact.address)
  const orderIdTitle = d?.orderIdTitle ?? t("orderIdTitle")
  const orderIdBody = d?.orderIdBody ?? t("orderIdBody")
  const orderIdCta = d?.orderIdCta ?? t("orderIdCta")
  // A legacy plain-body override (published before structured data existed)
  // still renders through the generic block renderer.
  const legacyBody = cms?.body && !d ? cms.body : null
  return (
    <div
      className="content-container py-12 small:py-16"
      data-testid="returns-page"
    >
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
        <>
          <div className="mt-8 grid gap-4 small:grid-cols-2">
            {steps.map((step, stepIndex) => (
              <div
                key={step.title || `step-${stepIndex}`}
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
              {conditionsTitle}
            </Heading>
            <ul className="mt-3 flex flex-col gap-y-2 text-small-regular text-ui-fg-subtle list-disc pl-5">
              {conditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </div>
        </>
      )}
      <div className="mt-8">
        <Heading level="h2" className="text-xl-semi">
          {channelsTitle}
        </Heading>
        <div className="mt-4 grid gap-4 small:grid-cols-3">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-2">
            <Heading level="h3" className="text-base-semi">
              WhatsApp
            </Heading>
            <Text className="text-small-regular text-ui-fg-subtle">
              {waBody}
            </Text>
            <a
              className="flex gap-x-1 items-center group w-fit"
              href={whatsappUrl(contact, waPrefill)}
              target="_blank"
              rel="noreferrer"
            >
              <Text className="text-ui-fg-interactive">{waCta}</Text>
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
              {emailBody}
            </Text>
            <a
              className="flex gap-x-1 items-center group w-fit"
              href={emailUrl(contact, emailSubject)}
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
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-2">
            <Heading level="h3" className="text-base-semi">
              {visitTitle}
            </Heading>
            <Text className="text-small-regular text-ui-fg-subtle">
              {visitBody}
            </Text>
            <InteractiveLink href="/contact">
              {t("storeDetails")}
            </InteractiveLink>
          </div>
        </div>
      </div>
      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <Heading level="h2" className="text-large-semi">
          {orderIdTitle}
        </Heading>
        <Text className="text-small-regular mt-2 text-ui-fg-subtle">
          {orderIdBody}
        </Text>
        <div className="mt-4">
          <InteractiveLink href="/account/orders">
            {orderIdCta}
          </InteractiveLink>
        </div>
      </div>
    </div>
  )
}

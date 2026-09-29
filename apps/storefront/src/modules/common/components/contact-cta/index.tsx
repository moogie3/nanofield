"use client"

import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"

import { whatsappUrl } from "@lib/store-contact"
import { Heading, Text } from "@modules/common/components/ui"

// "Contact us" banner rendered above the footer on storefront pages, except
// the catalog (/store) — which funnels into product cards — and the support
// pages themselves (/contact, /faq, /returns), which already cover it.
// Path shape is /<locale>/<countryCode>/<page…>, hence slice(2).
const HIDDEN_FIRST_SEGMENTS = ["store", "contact", "faq", "returns"]

const ContactCta = () => {
  const pathname = usePathname()
  const t = useTranslations("support.contact")
  const rest = pathname.split("/").filter(Boolean).slice(2)
  if (HIDDEN_FIRST_SEGMENTS.includes(rest[0] ?? "")) {
    return null
  }

  return (
    <section className="content-container pb-12" data-testid="contact-cta">
      <div className="bg-card border border-border rounded-2xl p-6 small:p-10 flex flex-col gap-6 small:flex-row small:items-center small:justify-between">
        <div className="max-w-2xl">
          <Heading level="h2" className="text-2xl-semi">
            {t("title")}
          </Heading>
          <Text className="text-base-regular mt-3 text-ui-fg-subtle">
            {t("subtitle")}
          </Text>
        </div>
        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex gap-2 items-center justify-center rounded-md font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 shrink-0"
        >
          {t("chatCta")}
        </a>
      </div>
    </section>
  )
}

export default ContactCta

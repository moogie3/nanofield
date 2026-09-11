import { Metadata } from "next"

import { mapsUrl, emailUrl, STORE_CONTACT, whatsappUrl } from "@lib/store-contact"
import { Heading, Text } from "@modules/common/components/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import PageHeader from "@modules/common/components/page-header"
import { ArrowUpRightMini } from "@medusajs/icons"

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with Nanofield customer support.",
}

export default function ContactPage() {
  return (
    <div
      className="content-container py-12 small:py-16"
      data-testid="contact-page"
    >
      <PageHeader
        eyebrow="Support"
        title="Contact us"
        subtitle="Questions about stock, part numbers, your order, or a return? Reach us on WhatsApp — for order questions, have your Order ID ready so we can help you faster."
      />
      <div className="mt-8 grid gap-4 small:grid-cols-3">
        <div
          className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-3"
          data-testid="contact-whatsapp"
        >
          <Heading level="h2" className="text-large-semi">
            Chat with support
          </Heading>
          <Text className="text-small-regular text-ui-fg-subtle">
            The fastest way to reach us for stock checks, order status, and
            return requests.
          </Text>
          <a
            className="flex gap-x-1 items-center group w-fit"
            href={whatsappUrl()}
            target="_blank"
            rel="noreferrer"
          >
            <Text className="text-ui-fg-interactive">
              Chat on WhatsApp
            </Text>
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
            Email us
          </Heading>
          <Text className="text-small-regular text-ui-fg-subtle">
            Best for longer explanations with several attachments.
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
            Visit the store
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
            <Text className="text-ui-fg-interactive">Open in Maps</Text>
            <ArrowUpRightMini
              className="group-hover:rotate-45 ease-in-out duration-150"
              color="var(--fg-interactive)"
            />
          </a>
        </div>
      </div>
      <div className="mt-8">
        <InteractiveLink href="/faq">Back to FAQ</InteractiveLink>
      </div>
    </div>
  )
}

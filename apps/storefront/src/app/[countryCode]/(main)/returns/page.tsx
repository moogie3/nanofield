import { Metadata } from "next"

import { emailUrl, STORE_CONTACT, whatsappUrl } from "@lib/store-contact"
import { Heading, Text } from "@modules/common/components/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import PageHeader from "@modules/common/components/page-header"
import { ArrowUpRightMini } from "@medusajs/icons"

export const metadata: Metadata = {
  title: "Returns & Exchanges",
  description:
    "How returns, exchanges, and damaged-item claims work at Nanofield.",
}

const STEPS = [
  {
    title: "1. Send a request",
    body: "Reach support through any channel below with your Order ID, the item(s) you want to return or exchange, the reason, and photos of the item and packaging.",
  },
  {
    title: "2. Review & approval",
    body: "Our team reviews every request against the order record and confirms whether it is approved, along with the return shipping instructions.",
  },
  {
    title: "3. Ship the item back",
    body: "Pack the item safely and send it to the address support gives you. Keep the courier receipt until the case is closed.",
  },
  {
    title: "4. Resolution",
    body: "Once the returned item is received and checked, we issue a refund to your original payment method or ship your replacement.",
  },
]

const CONDITIONS = [
  "Items should be unused and in their original packaging, unless they arrived damaged or different from what you ordered.",
  "Report damaged, defective, or wrong items as soon as possible after delivery, with unboxing photos.",
  "Refunds go back to the original payment method used at checkout.",
  "Shipping fees for approved returns are confirmed case by case with support.",
]

export default function ReturnsPage() {
  return (
    <div
      className="content-container py-12 small:py-16"
      data-testid="returns-page"
    >
      <PageHeader
        eyebrow="Support"
        title="Returns & Exchanges"
        subtitle="Changed your mind, received the wrong part, or got a damaged item? Every request is handled as a tracked case in our system — refund, replacement, or claim — and reviewed by the support team. You will need your Order ID to start."
      />
      <div className="mt-8 grid gap-4 small:grid-cols-2">
        {STEPS.map((step) => (
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
          Good to know
        </Heading>
        <ul className="mt-3 flex flex-col gap-y-2 text-small-regular text-ui-fg-subtle list-disc pl-5">
          {CONDITIONS.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      </div>
      <div className="mt-8">
        <Heading level="h2" className="text-xl-semi">
          Where to send your request
        </Heading>
        <div className="mt-4 grid gap-4 small:grid-cols-3">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-2">
            <Heading level="h3" className="text-base-semi">
              WhatsApp
            </Heading>
            <Text className="text-small-regular text-ui-fg-subtle">
              Fastest for return requests — photos go through instantly.
            </Text>
            <a
              className="flex gap-x-1 items-center group w-fit"
              href={whatsappUrl(
                "Halo Nanofield, saya mau request return/exchange untuk order ID: "
              )}
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
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-2">
            <Heading level="h3" className="text-base-semi">
              Email
            </Heading>
            <Text className="text-small-regular text-ui-fg-subtle">
              Best for longer explanations with several attachments.
            </Text>
            <a
              className="flex gap-x-1 items-center group w-fit"
              href={emailUrl("Return request")}
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
              Visit the store
            </Heading>
            <Text className="text-small-regular text-ui-fg-subtle">
              Bring the item with its packaging to {STORE_CONTACT.address}.
            </Text>
            <InteractiveLink href="/contact">
              Store details
            </InteractiveLink>
          </div>
        </div>
      </div>
      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <Heading level="h2" className="text-large-semi">
          Still need your Order ID first?
        </Heading>
        <Text className="text-small-regular mt-2 text-ui-fg-subtle">
          Every request starts with it — grab it from your orders list, then
          come back here to contact us.
        </Text>
        <div className="mt-4">
          <InteractiveLink href="/account/orders">
            Find your Order ID
          </InteractiveLink>
        </div>
      </div>
    </div>
  )
}

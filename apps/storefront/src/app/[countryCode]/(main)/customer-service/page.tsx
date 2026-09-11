import { Metadata } from "next"

import { Heading, Text } from "@modules/common/components/ui"
import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: "Customer service",
  description:
    "Help with orders, payments, shipping, returns, and contacting Nanofield support.",
}

const CHANNELS = [
  {
    title: "Contact us",
    body: "Chat with support on WhatsApp or find the store address.",
    href: "/contact",
    linkLabel: "Go to contact",
  },
  {
    title: "Returns & Exchanges",
    body: "How to request a return, replacement, or report a damaged item.",
    href: "/returns",
    linkLabel: "How returns work",
  },
  {
    title: "Track your orders",
    body: "Check payment, packing, and shipping status — each order shows a QR code you can scan.",
    href: "/account/orders",
    linkLabel: "View your orders",
  },
]

const FAQS = [
  {
    question: "How do I pay for my order?",
    answer:
      "Checkout supports QRIS, GoPay, and bank transfer via Midtrans. Your order is confirmed once the payment is captured — you can see the live status on your order.",
  },
  {
    question: "How do I track my shipment?",
    answer:
      "Open Account → Orders and pick the order to see whether it is being prepared, packed, shipped, or delivered. Tracking (AWB) numbers are booked manually by the courier, so ask support on WhatsApp if yours is not showing yet.",
  },
  {
    question: "I checked out as a guest. Where is my order?",
    answer:
      "Use the order transfer form at the bottom of the Orders page: paste the Order ID from your confirmation to link the order to your account.",
  },
  {
    question: "Something arrived damaged or wrong. What now?",
    answer:
      "Do not throw the packaging away — take unboxing photos and start a return request right away so we can file it as a claim and arrange a refund or replacement.",
  },
]

export default function CustomerServicePage() {
  return (
    <div
      className="content-container py-12 small:py-16"
      data-testid="customer-service-page"
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-subtle">
        Support
      </span>
      <Heading level="h1" className="text-2xl-semi mt-2">
        Customer service
      </Heading>
      <Text className="text-base-regular mt-3 max-w-2xl text-ui-fg-subtle">
        Everything about your order in one place — tracking, payments, returns,
        and how to reach a human when you need one.
      </Text>
      <div className="mt-8 grid gap-4 small:grid-cols-3">
        {CHANNELS.map((channel) => (
          <div
            key={channel.href}
            className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-y-3"
          >
            <Heading level="h2" className="text-large-semi">
              {channel.title}
            </Heading>
            <Text className="text-small-regular text-ui-fg-subtle">
              {channel.body}
            </Text>
            <InteractiveLink href={channel.href}>
              {channel.linkLabel}
            </InteractiveLink>
          </div>
        ))}
      </div>
      <div className="mt-12">
        <Heading level="h2" className="text-xl-semi">
          Frequently asked questions
        </Heading>
        <div className="mt-4 flex flex-col gap-4">
          {FAQS.map((faq) => (
            <div
              key={faq.question}
              className="bg-card border border-border rounded-2xl p-6"
            >
              <Heading level="h3" className="text-base-semi">
                {faq.question}
              </Heading>
              <Text className="text-small-regular mt-2 text-ui-fg-subtle">
                {faq.answer}
              </Text>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { Metadata } from "next"

import { STORE_CONTACT } from "@lib/store-contact"
import { Heading, Text } from "@modules/common/components/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import PageHeader from "@modules/common/components/page-header"

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about orders, payments, shipping, returns, and contacting Nanofield support.",
}

const SECTIONS: { heading: string; items: { q: string; a: string }[] }[] = [
  {
    heading: "Orders & tracking",
    items: [
      {
        q: "Where do I find my Order ID?",
        a: "Open Account → Orders. Every order card shows the Order ID at the top with its display number underneath. The details page repeats it right under the confirmation message, next to a QR code you can scan to reopen the same order.",
      },
      {
        q: "What do the order statuses mean?",
        a: "Preparing means we are getting your parts ready, Packed means the parcel is handed over to the courier, Shipped means it is on its way with a courier, and Delivered means it arrived. Payment has its own status next to it: Awaiting payment, Authorized, or Paid.",
      },
      {
        q: "My tracking (AWB) number is not showing. Why?",
        a: "Tracking numbers are booked manually with the courier after handoff, so there can be a short delay between the Shipped status and the AWB appearing. If it still has not shown up, send us your Order ID on WhatsApp and we will look it up.",
      },
      {
        q: "I checked out as a guest. Where is my order?",
        a: "Scroll to the order transfer form at the bottom of the Orders page and paste the Order ID from your confirmation. That links the order to your account so you can follow it there.",
      },
    ],
  },
  {
    heading: "Payments",
    items: [
      {
        q: "How can I pay?",
        a: "Checkout supports QRIS, GoPay, and bank transfer through Midtrans. Your order is confirmed once the payment is captured — the order page shows the live status.",
      },
      {
        q: "What is the difference between Authorized and Paid?",
        a: "Authorized means your payment method approved the amount but the money has not been captured yet. Paid (captured) means the payment landed and your order moves to preparation.",
      },
      {
        q: "My payment is stuck on Awaiting payment. What should I do?",
        a: "Finish the payment in your e-wallet or banking app first — pending Midtrans transactions expire automatically. If you already paid but the status did not move, contact support with your Order ID and payment proof.",
      },
    ],
  },
  {
    heading: "Shipping",
    items: [
      {
        q: "Which couriers do you use, and what does it cost?",
        a: "Courier options and costs are calculated at checkout from the parcel weight and your destination, with J&T Express and JNE among the available services.",
      },
      {
        q: "Can I change the shipping address after ordering?",
        a: "Only before the order is packed. Contact support immediately with your Order ID — once the parcel is handed to the courier the address can no longer be changed.",
      },
    ],
  },
  {
    heading: "Returns & exchanges",
    items: [
      {
        q: "How do I request a return or exchange?",
        a: "Reach support by WhatsApp, phone, email, or by visiting the store, with your Order ID, the item(s), the reason, and photos of the item and packaging. Every case is tracked in our system from request to refund or replacement.",
      },
      {
        q: "What if my item arrived damaged or wrong?",
        a: "Keep all packaging and take unboxing photos, then report it right away. Damaged and wrong-item cases are filed as claims so we can prioritize a refund or a replacement shipment.",
      },
      {
        q: "How do refunds work?",
        a: "Once the returned item is received and checked, the refund goes back to the original payment method you used at checkout.",
      },
    ],
  },
  {
    heading: "Parts & stock",
    items: [
      {
        q: "How do I find the right part number?",
        a: "Search the catalog by part number or specification — many listings include datasheets. If you are unsure, send us the markings on the old part or the appliance model on WhatsApp and we will help you match it.",
      },
      {
        q: "An item I need is out of stock. Can you get it?",
        a: "Often yes. Ask support with the exact part number and quantity — we source components regularly and can tell you the lead time.",
      },
      {
        q: "Do you have a physical store?",
        a: `Yes — visit us at ${STORE_CONTACT.address}. For directions, use the Maps link in the footer or on the contact page.`,
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="content-container py-12 small:py-16" data-testid="faq-page">
      <PageHeader
        eyebrow="Support"
        title="Frequently asked questions"
        subtitle="Everything about your order in one place — tracking, payments, shipping, returns, and how to reach a human when you need one."
      />
      {SECTIONS.map((section) => (
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
          Still need help?
        </Heading>
        <Text className="text-small-regular mt-2 text-ui-fg-subtle">
          Could not find your answer? Reach support directly, or read how
          returns and exchanges work step by step.
        </Text>
        <div className="mt-4 flex flex-col gap-4 small:flex-row small:items-center">
          <InteractiveLink href="/contact">
            Still stuck? Contact us
          </InteractiveLink>
          <InteractiveLink href="/returns">
            Read the returns process
          </InteractiveLink>
        </div>
      </div>
    </div>
  )
}

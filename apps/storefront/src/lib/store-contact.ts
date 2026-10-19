// Single source of truth for the public store contact channels.
// The values below are the built-in DEFAULTS. Operators can override each one
// from the admin (Content → Storefront Content); the server-only resolver in
// @lib/data/store-contact overlays those overrides per locale. This module
// stays free of server imports so client components (e.g. contact-cta) can
// import the URL helpers too.
export type StoreContact = {
  whatsapp: string
  email: string
  address: string
  whatsappMessage: string
}

export const STORE_CONTACT: StoreContact = {
  whatsapp: "6285121550532",
  email: "customer-support@nanofield.com",
  address: "Jakarta, Indonesia",
  whatsappMessage: "Halo Nanofield, saya mau tanya stok part.",
}

export const whatsappUrl = (
  contact: StoreContact = STORE_CONTACT,
  message: string = contact.whatsappMessage
) => `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`

export const phoneUrl = (contact: StoreContact = STORE_CONTACT) =>
  `tel:+${contact.whatsapp}`

export const emailUrl = (
  contact: StoreContact = STORE_CONTACT,
  subject: string = "Nanofield support"
) => `mailto:${contact.email}?subject=${encodeURIComponent(subject)}`

export const mapsUrl = (contact: StoreContact = STORE_CONTACT) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    contact.address
  )}`

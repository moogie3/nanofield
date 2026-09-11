// Single source of truth for the public store contact channels.
// TODO: move these to the backend (e.g. Medusa store metadata / settings
// module) once the admin-facing config is ready.
export const STORE_CONTACT = {
  whatsapp: "6285121550532",
  whatsappDisplay: "0851-2155-0532",
  whatsappMessage: "Halo Nanofield, saya mau tanya stok part.",
  email: "customer-support@nanofield.com",
  address: "Jakarta, Indonesia",
}

export const whatsappUrl = (message: string = STORE_CONTACT.whatsappMessage) =>
  `https://wa.me/${STORE_CONTACT.whatsapp}?text=${encodeURIComponent(message)}`

export const phoneUrl = () => `tel:+${STORE_CONTACT.whatsapp}`

export const emailUrl = (subject: string = "Nanofield support") =>
  `mailto:${STORE_CONTACT.email}?subject=${encodeURIComponent(subject)}`

export const mapsUrl = () =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    STORE_CONTACT.address
  )}`

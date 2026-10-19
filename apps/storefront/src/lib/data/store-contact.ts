"use server"

import { getSiteSettings } from "./content"
import { STORE_CONTACT, type StoreContact } from "@lib/store-contact"

// Backend-managed contact channels for one locale, falling back to the
// built-in defaults in @lib/store-contact for any unset value. The backend
// already applies the locale fallback (en over id), so a blank override here
// means "never configured" and the default wins.
export const getStoreContact = async (
  locale: string
): Promise<StoreContact> => {
  const settings = await getSiteSettings(locale)
  return {
    whatsapp: settings["contact.whatsapp"] || STORE_CONTACT.whatsapp,
    email: settings["contact.email"] || STORE_CONTACT.email,
    address: settings["contact.address"] || STORE_CONTACT.address,
    whatsappMessage:
      settings["contact.whatsappMessage"] || STORE_CONTACT.whatsappMessage,
  }
}

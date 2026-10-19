// Fixed catalog of storefront settings. Adding an editable field means adding
// one entry here (label + limits + default); the admin form, the API
// validator, and the public store feed all read from this map, so a new key
// never needs a migration.

// Storefront locales, default first. The default locale is the fallback base:
// an unset value in a non-default locale resolves to the default-locale value.
export const CONTENT_LOCALES = ["id", "en"] as const
export type ContentLocale = (typeof CONTENT_LOCALES)[number]
export const DEFAULT_CONTENT_LOCALE: ContentLocale = "id"

export type ContentKeyDef = {
  label: string
  hint?: string
  maxLen: number
  multiline?: boolean
  // Built-in value when no override is stored. A string applies to every
  // locale; an object overrides per locale. These mirror the storefront's own
  // fallbacks (apps/storefront/src/messages/{locale}.json and
  // @lib/store-contact), so the admin previews exactly what is live today and
  // the store feed can serve a value even before anything is configured.
  default: string | Partial<Record<ContentLocale, string>>
}

export const CONTENT_KEYS: Record<string, ContentKeyDef> = {
  "contact.whatsapp": {
    label: "WhatsApp number",
    hint: "International format, digits only (e.g. 6285121550532).",
    maxLen: 20,
    default: "6285121550532",
  },
  "contact.email": {
    label: "Support email",
    maxLen: 200,
    default: "customer-support@nanofield.com",
  },
  "contact.address": {
    label: "Store address",
    maxLen: 300,
    default: "Jakarta, Indonesia",
  },
  "contact.whatsappMessage": {
    label: "WhatsApp pre-filled message",
    maxLen: 500,
    multiline: true,
    default: "Halo Nanofield, saya mau tanya stok part.",
  },
  "home.hero.badge": {
    label: "Hero badge",
    maxLen: 120,
    default: {
      id: "Buka untuk pesanan — 900+ part tersedia",
      en: "Open for orders — 900+ parts in stock",
    },
  },
  "home.hero.subtitle": {
    label: "Hero subtitle",
    maxLen: 400,
    multiline: true,
    default: {
      id: "Komponen Elektronik Presisi & Suku Cadang Peralatan. Cari per nomor part IC, jelajahi datasheet, dan cek stok B2B/B2C real-time.",
      en: "Precision Electronic Components & Appliance Spare Parts. Search by IC part number, browse datasheets, and check real-time B2B/B2C stock.",
    },
  },
  "home.hero.ctaLabel": {
    label: "Hero button label",
    maxLen: 60,
    default: {
      id: "Masuk Katalog",
      en: "Enter Catalog",
    },
  },
  "footer.tagline": {
    label: "Footer tagline",
    maxLen: 300,
    multiline: true,
    default: {
      id: "Komponen elektronik presisi & suku cadang peralatan — terindeks per nomor part, didukung datasheet.",
      en: "Precision electronic components & appliance spare parts — indexed by part number, backed by datasheets.",
    },
  },
}

export const isContentKey = (key: string): boolean =>
  Object.prototype.hasOwnProperty.call(CONTENT_KEYS, key)

export const isContentLocale = (locale: string): boolean =>
  (CONTENT_LOCALES as readonly string[]).includes(locale)

// Built-in value for one key in one locale. A string default applies to every
// locale; an object falls back to the default locale when the requested one is
// absent. Pure — shared by the store route and the admin catalog.
export const resolveContentDefault = (
  def: ContentKeyDef,
  locale: string
): string => {
  if (typeof def.default === "string") {
    return def.default
  }
  return (
    def.default[locale as ContentLocale] ??
    def.default[DEFAULT_CONTENT_LOCALE] ??
    ""
  )
}

// Merges a non-default locale's values over the default-locale values, per
// key. Empty values never shadow a fallback. Pure — shared by the store route
// and its unit spec.
export const mergeLocaleSettings = (
  defaults: Record<string, string>,
  localized: Record<string, string>
): Record<string, string> => {
  const out: Record<string, string> = { ...defaults }
  for (const [key, value] of Object.entries(localized)) {
    if (value) {
      out[key] = value
    }
  }
  return out
}

// Registry of storefront pages that have a sectioned (structured) editing
// form in the admin, instead of the free-text body used by custom pages
// (about/terms/...). Each entry maps a content_page slug to the form the
// admin builds for it; the form's field keys are the top-level keys of the
// page's `data` JSON column.
//
// Sections are admin-only grouping (labels + layout); they do not appear in
// the stored data. The storefront renderers merge each data field over the
// i18n copy in messages/{id,en}.json, so a missing key always shows the
// shipped default and a page can never go blank.
//
// Keep field keys in sync with the storefront renderers:
//   returns -> app/[locale]/[countryCode]/(main)/returns/page.tsx
//   faq     -> app/[locale]/[countryCode]/(main)/faq/page.tsx
//   contact -> app/[locale]/[countryCode]/(main)/contact/page.tsx
export type RegistryScalarField = {
  key: string
  kind: "text" | "paragraph"
  label: string
  maxLength: number
}

// Storage rule for lists in the data column, shared by the admin form and
// the storefront renderers: a list with exactly one scalar itemField stores
// plain strings (conditions: ["...", ...]), a list with several itemFields
// stores objects keyed by field key (steps: [{ title, body }, ...]). itemFields
// may nest one level further (FAQ sections contain a list of Q&A items).
export type RegistryListField = {
  key: string
  kind: "list"
  label: string
  maxItems: number
  itemFields: RegistryField[]
}

// True when a list's items are plain strings rather than objects.
export const isSimpleList = (field: RegistryListField): boolean =>
  field.itemFields.length === 1 && field.itemFields[0].kind !== "list"

export type RegistryField = RegistryScalarField | RegistryListField

export type RegistrySection = {
  label: string
  fields: RegistryField[]
}

export type RegistryPage = {
  slug: string
  path: string
  label: string
  sections: RegistrySection[]
}

export const CONTENT_PAGE_REGISTRY: RegistryPage[] = [
  {
    slug: "returns",
    path: "/returns",
    label: "Returns & Exchanges",
    sections: [
      {
        label: "Process steps",
        fields: [
          {
            key: "steps",
            kind: "list",
            label: "Steps",
            maxItems: 10,
            itemFields: [
              { key: "title", kind: "text", label: "Step title", maxLength: 120 },
              {
                key: "body",
                kind: "paragraph",
                label: "Step body",
                maxLength: 2000,
              },
            ],
          },
        ],
      },
      {
        label: "\u201cGood to know\u201d card",
        fields: [
          {
            key: "conditionsTitle",
            kind: "text",
            label: "Card title",
            maxLength: 120,
          },
          {
            key: "conditions",
            kind: "list",
            label: "Bullet points",
            maxItems: 12,
            itemFields: [
              {
                key: "text",
                kind: "paragraph",
                label: "Point",
                maxLength: 500,
              },
            ],
          },
        ],
      },
      {
        label: "Contact channels copy",
        fields: [
          {
            key: "channelsTitle",
            kind: "text",
            label: "Section title",
            maxLength: 120,
          },
          {
            key: "waBody",
            kind: "paragraph",
            label: "WhatsApp card body",
            maxLength: 500,
          },
          { key: "waCta", kind: "text", label: "WhatsApp CTA", maxLength: 80 },
          {
            key: "waPrefill",
            kind: "text",
            label: "WhatsApp pre-filled message",
            maxLength: 300,
          },
          {
            key: "emailBody",
            kind: "paragraph",
            label: "Email card body",
            maxLength: 500,
          },
          {
            key: "emailSubject",
            kind: "text",
            label: "Email subject",
            maxLength: 120,
          },
          {
            key: "visitTitle",
            kind: "text",
            label: "Visit card title",
            maxLength: 120,
          },
          {
            key: "visitBody",
            kind: "paragraph",
            label: "Visit card body ({address} = store address)",
            maxLength: 500,
          },
        ],
      },
      {
        label: "\u201cOrder ID\u201d card",
        fields: [
          {
            key: "orderIdTitle",
            kind: "text",
            label: "Card title",
            maxLength: 120,
          },
          {
            key: "orderIdBody",
            kind: "paragraph",
            label: "Card body",
            maxLength: 500,
          },
          {
            key: "orderIdCta",
            kind: "text",
            label: "Card CTA",
            maxLength: 80,
          },
        ],
      },
    ],
  },
  {
    slug: "faq",
    path: "/faq",
    label: "FAQ",
    sections: [
      {
        label: "FAQ sections",
        fields: [
          {
            key: "sections",
            kind: "list",
            label: "Sections",
            maxItems: 12,
            itemFields: [
              {
                key: "heading",
                kind: "text",
                label: "Section heading",
                maxLength: 120,
              },
              {
                key: "items",
                kind: "list",
                label: "Questions",
                maxItems: 30,
                itemFields: [
                  {
                    key: "q",
                    kind: "text",
                    label: "Question",
                    maxLength: 300,
                  },
                  {
                    key: "a",
                    kind: "paragraph",
                    label: "Answer",
                    maxLength: 2000,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        label: "\u201cStill need help\u201d card",
        fields: [
          {
            key: "stillTitle",
            kind: "text",
            label: "Card title",
            maxLength: 120,
          },
          {
            key: "stillBody",
            kind: "paragraph",
            label: "Card body",
            maxLength: 1000,
          },
          {
            key: "contactCta",
            kind: "text",
            label: "Contact CTA",
            maxLength: 80,
          },
          {
            key: "returnsCta",
            kind: "text",
            label: "Returns CTA",
            maxLength: 80,
          },
        ],
      },
    ],
  },
  {
    slug: "contact",
    path: "/contact",
    label: "Contact",
    sections: [
      {
        label: "WhatsApp card",
        fields: [
          { key: "chatTitle", kind: "text", label: "Card title", maxLength: 120 },
          {
            key: "chatBody",
            kind: "paragraph",
            label: "Card body",
            maxLength: 1000,
          },
          { key: "chatCta", kind: "text", label: "Card CTA", maxLength: 80 },
        ],
      },
      {
        label: "Email card",
        fields: [
          {
            key: "emailTitle",
            kind: "text",
            label: "Card title",
            maxLength: 120,
          },
          {
            key: "emailBody",
            kind: "paragraph",
            label: "Card body",
            maxLength: 1000,
          },
        ],
      },
      {
        label: "Visit card",
        fields: [
          {
            key: "visitTitle",
            kind: "text",
            label: "Card title",
            maxLength: 120,
          },
          { key: "mapsCta", kind: "text", label: "Maps CTA", maxLength: 80 },
        ],
      },
      {
        label: "Page footer",
        fields: [
          {
            key: "backFaq",
            kind: "text",
            label: "\u201cBack to FAQ\u201d link",
            maxLength: 80,
          },
        ],
      },
    ],
  },
]

export const findRegistryPage = (slug: string): RegistryPage | null =>
  CONTENT_PAGE_REGISTRY.find((page) => page.slug === slug) ?? null

// Every allowed top-level key of a registry page's data object (one per
// section field; nested list item keys live inside items, not at the top).
export const registryFieldKeys = (page: RegistryPage): string[] =>
  page.sections.flatMap((section) =>
    section.fields.map((field) => field.key)
  )

// The field definition behind a top-level data key, or null if the key is
// not part of the page's form (used to validate incoming data payloads).
export const findRegistryField = (
  page: RegistryPage,
  key: string
): RegistryField | null =>
  page.sections
    .flatMap((section) => section.fields)
    .find((field) => field.key === key) ?? null

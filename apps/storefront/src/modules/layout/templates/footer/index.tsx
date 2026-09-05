import { listCategories } from "@lib/data/categories"
import { Text, clx } from "@modules/common/components/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

const HIDDEN_CATEGORY_MATCHERS = [
  "shirt",
  "pant",
  "sweat",
  "merch",
  "short",
  "collection",
]

// TODO: move these to the backend (e.g. Medusa store metadata / settings
// module) once the admin-facing config is ready — footer reads them from here.
const STORE_CONTACT = {
  whatsapp: "6281234567890",
  whatsappMessage: "Halo Nanofield, saya mau tanya stok part.",
  address: "Jakarta, Indonesia",
}

export default async function Footer() {
  const productCategories = await listCategories()

  const catalogCategories = (productCategories ?? [])
    .filter((c) => !c.parent_category)
    .filter(
      (c) =>
        !HIDDEN_CATEGORY_MATCHERS.some((m) =>
          c.name.toLowerCase().includes(m)
        )
    )
    .slice(0, 6)

  const whatsappUrl = `https://wa.me/${STORE_CONTACT.whatsapp}?text=${encodeURIComponent(
    STORE_CONTACT.whatsappMessage
  )}`
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    STORE_CONTACT.address
  )}`

  return (
    <footer className="relative w-full border-t border-border bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
      />
      <div className="content-container flex w-full flex-col">
        <div className="flex flex-col gap-10 py-12 small:flex-row small:items-start small:justify-between">
          <div className="max-w-sm">
            <LocalizedClientLink
              href="/"
              className="font-heading text-lg font-bold uppercase tracking-wide text-primary"
            >
              Nanofield
            </LocalizedClientLink>
            <p className="text-small-regular mt-3 text-ui-fg-subtle">
              Precision electronic components &amp; appliance spare parts —
              indexed by part number, backed by datasheets.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              ICs · Transistors · MOSFETs · Passives
            </p>
          </div>
          <div className="flex flex-wrap gap-10 small:gap-12">
            <div className="flex flex-col gap-y-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-base">
                Catalog
              </span>
              <ul className="text-small-regular grid grid-cols-1 gap-2 text-ui-fg-subtle">
                <li>
                  <LocalizedClientLink
                    className="hover:text-foreground"
                    href="/store"
                  >
                    All parts
                  </LocalizedClientLink>
                </li>
                {catalogCategories.map((c) => (
                  <li key={c.id}>
                    <LocalizedClientLink
                      className={clx("hover:text-foreground")}
                      href={`/categories/${c.handle}`}
                      data-testid="category-link"
                    >
                      {c.name}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-y-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-base">
                Account
              </span>
              <ul className="text-small-regular grid grid-cols-1 gap-2 text-ui-fg-subtle">
                <li>
                  <LocalizedClientLink
                    className="hover:text-foreground"
                    href="/cart"
                  >
                    Cart
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-foreground"
                    href="/account"
                  >
                    Orders
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-y-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-base">
                Contact
              </span>
              <ul className="text-small-regular grid grid-cols-1 gap-2 text-ui-fg-subtle">
                <li>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    WhatsApp ↗
                  </a>
                </li>
                <li>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="max-w-44 hover:text-foreground"
                  >
                    {STORE_CONTACT.address} ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 border-t border-border py-6 text-ui-fg-muted small:flex-row small:items-center small:justify-between">
          <Text className="txt-compact-small">
            © {new Date().getFullYear()} Nanofield. All rights reserved.
          </Text>
          <Text className="font-mono text-[11px] uppercase tracking-[0.2em]">
            Repair &amp; maintenance sourcing
          </Text>
        </div>
      </div>
    </footer>
  )
}

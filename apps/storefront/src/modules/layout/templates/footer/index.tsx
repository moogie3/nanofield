import { listCategories } from "@lib/data/categories"
import { mapsUrl, STORE_CONTACT, whatsappUrl } from "@lib/store-contact"
import { Text, clx } from "@modules/common/components/ui"
import { getTranslations } from "next-intl/server"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

const HIDDEN_CATEGORY_MATCHERS = [
  "shirt",
  "pant",
  "sweat",
  "merch",
  "short",
  "collection",
]

// Store contact channels live in @lib/store-contact (single source of truth).
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

  const whatsappLink = whatsappUrl()
  const mapsLink = mapsUrl()
  const t = await getTranslations("footer")

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
              {t("tagline")}
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
                {t("catalog")}
              </span>
              <ul className="text-small-regular grid grid-cols-1 gap-2 text-ui-fg-subtle">
                <li>
                  <LocalizedClientLink
                    className="hover:text-foreground"
                    href="/store"
                  >
                    {t("allParts")}
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
                {t("account")}
              </span>
              <ul className="text-small-regular grid grid-cols-1 gap-2 text-ui-fg-subtle">
                <li>
                  <LocalizedClientLink
                    className="hover:text-foreground"
                    href="/cart"
                  >
                    {t("cart")}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-foreground"
                    href="/account"
                  >
                    {t("orders")}
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-y-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-base">
                {t("support")}
              </span>
              <ul className="text-small-regular grid grid-cols-1 gap-2 text-ui-fg-subtle">
                <li>
                  <LocalizedClientLink
                    className="hover:text-foreground"
                    href="/faq"
                  >
                    FAQ
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-foreground"
                    href="/contact"
                  >
                    {t("contactUs")}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-foreground"
                    href="/returns"
                  >
                    {t("returns")}
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-y-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-base">
                {t("contact")}
              </span>
              <ul className="text-small-regular grid grid-cols-1 gap-2 text-ui-fg-subtle">
                <li>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    WhatsApp ↗
                  </a>
                </li>
                <li>
                  <a
                    href={mapsLink}
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
            © {new Date().getFullYear()} Nanofield. {t("rights")}
          </Text>
          <Text className="font-mono text-[11px] uppercase tracking-[0.2em]">
            {t("sourcing")}
          </Text>
        </div>
      </div>
    </footer>
  )
}

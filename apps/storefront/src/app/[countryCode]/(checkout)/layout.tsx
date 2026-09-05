import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import ChevronDown from "@modules/common/icons/chevron-down"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full bg-background relative small:min-h-screen">
      <div className="sticky top-0 z-50 h-16 border-b border-border relative bg-[color-mix(in_oklch,var(--background)_70%,transparent)] backdrop-blur-xl">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink
            href="/cart"
            className="text-small-semi text-ui-fg-base flex items-center gap-x-2 uppercase flex-1 basis-0"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base ">
              Back to shopping cart
            </span>
            <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
              Back
            </span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/"
            className="nav-wordmark font-heading text-2xl font-bold uppercase text-primary"
            data-testid="store-link"
          >
            Nanofield
          </LocalizedClientLink>
          <div className="flex-1 basis-0" />
        </nav>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        />
      </div>
      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
      <div className="py-4 w-full flex items-center justify-center">
        <Text className="font-mono text-[11px] uppercase tracking-[0.2em] text-ui-fg-muted">
          Nanofield · Secure checkout
        </Text>
      </div>
    </div>
  )
}

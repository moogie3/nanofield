"use client"

import { Fragment } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { usePathname } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Intent gate: guests who try to buy (card quick-add, product add-to-cart)
// get this instead of touching the cart. Sign-in preserves the current
// page via return_to so the shopper lands back where they started.
export default function SignInGateModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const href = `/account?return_to=${encodeURIComponent(pathname)}`

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[75]"
        onClose={onClose}
        data-testid="sign-in-gate-modal"
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl border border-border bg-card p-8 text-center align-middle transition-all">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <Dialog.Title
                  as="h2"
                  className="mt-4 font-heading text-xl font-bold tracking-tight text-foreground"
                >
                  Sign in required
                </Dialog.Title>
                <p className="mt-2 text-small-regular text-ui-fg-subtle">
                  Prices and checkout are for Nanofield members. Sign in or
                  create a verified account to continue.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <LocalizedClientLink
                    href={href}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:opacity-90"
                  >
                    Sign in
                  </LocalizedClientLink>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-border px-6 text-sm font-bold uppercase tracking-widest text-ui-fg-base transition-colors hover:bg-muted"
                  >
                    Keep browsing
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

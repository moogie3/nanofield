"use client"

import { useState } from "react"
import { XMark } from "@medusajs/icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Megaphone01Icon } from "@hugeicons/core-free-icons"
import type { StoreBanner } from "@lib/data/banners"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const dismissKey = (id: string) => `nf-banner-dismissed-${id}`

// Dismissible announcement strip. Per-banner localStorage dismissal — a new
// banner id shows again even if an old one was dismissed.
export default function AnnouncementStrip({ banner }: { banner: StoreBanner }) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(dismissKey(banner.id)) === "1"
    } catch {
      return false
    }
  })

  if (dismissed) {
    return null
  }

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(dismissKey(banner.id), "1")
    } catch {
      // private mode — hides for this session
    }
  }

  const body = (
    <>
      <HugeiconsIcon
        icon={Megaphone01Icon}
        strokeWidth={2}
        className="h-5 w-5 shrink-0 text-primary"
      />
      <span className="flex-1 min-w-0">
        <span className="block text-small-semi text-ui-fg-base">
          {banner.title}
        </span>
        {!!banner.description && (
          <span className="block text-small-regular text-ui-fg-subtle line-clamp-2">
            {banner.description}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          dismiss()
        }}
        aria-label="Dismiss announcement"
        className="shrink-0 rounded-md p-1 text-ui-fg-subtle hover:bg-muted hover:text-ui-fg-base focus:outline-none"
      >
        <XMark />
      </button>
    </>
  )

  const classes =
    "flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3"

  return banner.link ? (
    <LocalizedClientLink
      href={banner.link}
      className={`${classes} transition-colors hover:bg-primary/15`}
    >
      {body}
    </LocalizedClientLink>
  ) : (
    <div className={classes}>{body}</div>
  )
}

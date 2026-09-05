import { useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { NanofieldAvatar } from "../components/nanofield-avatar"
import {
  applyFavicon,
  applyFonts,
  applyTitle,
  replaceAvatarLogos,
  swapMedusaImages,
} from "../lib/brand-dom"

const applyAll = () => {
  applyTitle()
  applyFavicon()
  applyFonts()
  replaceAvatarLogos()
  swapMedusaImages()
}

// The topbar renders on every dashboard page, so this widget is the host
// for all global brand effects plus a visible Nanofield badge.
const BrandingWidget = () => {
  useEffect(() => {
    applyAll()

    const titleEl = document.querySelector("title")
    const titleObserver = new MutationObserver(applyTitle)
    if (titleEl) {
      titleObserver.observe(titleEl, { childList: true })
    }

    // SPA re-renders can re-mount stock artwork; watch briefly, then stop.
    const bodyObserver = new MutationObserver(applyAll)
    bodyObserver.observe(document.body, { childList: true, subtree: true })
    const stopTimer = setTimeout(() => bodyObserver.disconnect(), 8000)

    return () => {
      titleObserver.disconnect()
      bodyObserver.disconnect()
      clearTimeout(stopTimer)
    }
  }, [])

  return (
    <div className="flex items-center gap-2 px-1" data-nanofield-brand="topbar">
      <NanofieldAvatar className="h-6 w-6" />
      <span className="hidden text-xs font-bold tracking-[0.18em] lg:inline">
        NANOFIELD
      </span>
    </div>
  )
}

export const config = defineWidgetConfig({
  id: "nanofield:branding",
  zone: "topbar",
})

export default BrandingWidget

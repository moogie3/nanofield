import { useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { NanofieldAvatar } from "../components/nanofield-avatar"
import {
  applyFavicon,
  applyFonts,
  applySettingsSpacing,
  applyTitle,
  replaceAvatarLogos,
  scrubStaticCopy,
  swapMedusaImages,
} from "../lib/brand-dom"

const applyAll = () => {
  applyTitle()
  applyFavicon()
  applyFonts()
  replaceAvatarLogos()
  swapMedusaImages()
  scrubStaticCopy()
  applySettingsSpacing()
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
    // Route changes and popover menus (user menu) after that are covered
    // by event-driven re-sweeps — no perpetual observer.
    const bodyObserver = new MutationObserver(applyAll)
    bodyObserver.observe(document.body, { childList: true, subtree: true })
    const stopTimer = setTimeout(() => bodyObserver.disconnect(), 8000)
    const lateTimer = setTimeout(applyAll, 2000)
    const onNav = () => {
      setTimeout(applyAll, 600)
    }
    // Popover menus (user menu) open without route changes; re-sweep when
    // focus moves (keyboard users included). Guarded: skips work when no
    // menu is open.
    const onFocus = () => {
      if (document.querySelector('[role="menu"]')) {
        setTimeout(applyAll, 100)
      }
    }
    document.addEventListener("click", onNav, true)
    document.addEventListener("focusin", onFocus)
    window.addEventListener("popstate", onNav)

    return () => {
      titleObserver.disconnect()
      bodyObserver.disconnect()
      document.removeEventListener("click", onNav, true)
      document.removeEventListener("focusin", onFocus)
      window.removeEventListener("popstate", onNav)
      clearTimeout(stopTimer)
      clearTimeout(lateTimer)
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

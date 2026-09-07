import { useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { applyFonts, applyLoginCircuit, applyTitle, hideStockLoginHeadings, removeLoginCircuit, replaceAvatarLogos } from "../lib/brand-dom"

// Login page: the stock AvatarBox artwork is swapped for the Nanofield
// avatar in place (keeps Medusa's own avatar frame), stock headings are
// hidden, and our welcome copy renders below via this widget. Fonts are
// applied here too — the login page has no topbar, so the global branding
// widget (which normally injects them) never mounts on this route.
const sweep = () => {
  replaceAvatarLogos()
  hideStockLoginHeadings()
  applyTitle()
  applyFonts()
}

const LoginBrandingWidget = () => {
  useEffect(() => {
    applyLoginCircuit()
    sweep()
    // i18n + form mount async after us; re-sweep briefly, then stop.
    const observer = new MutationObserver(sweep)
    observer.observe(document.body, { childList: true, subtree: true })
    // Title lives in <head>: body mutations never fire for it, so watch
    // the title element itself (guarded assignment can't loop).
    const titleEl = document.querySelector("title")
    const titleObserver = new MutationObserver(applyTitle)
    if (titleEl) {
      titleObserver.observe(titleEl, { childList: true })
    }
    const timer = setTimeout(() => {
      observer.disconnect()
      titleObserver.disconnect()
    }, 8000)
    return () => {
      observer.disconnect()
      titleObserver.disconnect()
      removeLoginCircuit()
      clearTimeout(timer)
    }
  }, [])

  return (
    <div
      className="mb-2 flex flex-col items-center gap-1 text-center"
      data-nanofield-brand="login"
    >
      <h1 className="text-xl font-semibold text-ui-fg-base">
        Welcome to Nanofield
      </h1>
      <p className="txt-small text-ui-fg-subtle">Sign in to access your store</p>
    </div>
  )
}

export const config = defineWidgetConfig({
  id: "nanofield:login-branding",
  zone: "login.before",
})

export default LoginBrandingWidget

import { useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { applyLoginTiles, applyTitle, hideStockLoginHeadings, removeLoginTiles, replaceAvatarLogos } from "../lib/brand-dom"

// Login page: the stock AvatarBox artwork is swapped for the Nanofield
// avatar in place (keeps Medusa's own avatar frame), stock headings are
// hidden, and our welcome copy renders below via this widget.
const sweep = () => {
  replaceAvatarLogos()
  hideStockLoginHeadings()
  applyTitle()
}

const LoginBrandingWidget = () => {
  useEffect(() => {
    applyLoginTiles()
    sweep()
    // i18n + form mount async after us; re-sweep briefly, then stop.
    const observer = new MutationObserver(sweep)
    observer.observe(document.body, { childList: true, subtree: true })
    const timer = setTimeout(() => observer.disconnect(), 8000)
    return () => {
      observer.disconnect()
      removeLoginTiles()
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

"use client"

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { updateLocale } from "@lib/data/locale-actions"
import { routing } from "@/i18n/routing"

/**
 * ID | EN language toggle. Switches the /<locale> URL prefix (source of
 * truth for UI language) and syncs the backend cart locale best-effort.
 * Sits next to the theme toggle in the nav + inside the side menu.
 */
const LocaleToggle = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useParams()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("locale")

  const active = typeof locale === "string" ? locale : routing.defaultLocale

  const switchTo = (next: string) => {
    if (next === active || isPending) {
      return
    }
    startTransition(async () => {
      // Keep the backend cart/content locale in sync; the URL prefix
      // remains authoritative for UI language if this fails.
      try {
        await updateLocale(next)
      } catch {
        // backend locales not configured — URL toggle still works
      }
      const query = searchParams.toString()
      const rest = pathname.replace(new RegExp(`^/${active}`, "i"), "") || "/"
      router.push(`/${next}${rest}${query ? `?${query}` : ""}`)
    })
  }

  const button = (code: "id" | "en", label: string, aria: string) => {
    const selected = active === code
    return (
      <button
        key={code}
        type="button"
        onClick={() => switchTo(code)}
        disabled={isPending}
        aria-label={aria}
        aria-pressed={selected}
        className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 ${
          selected
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5"
      role="group"
      aria-label={t("label")}
    >
      {button("id", t("shortIndonesian"), t("switchToIndonesian"))}
      {button("en", t("shortEnglish"), t("switchToEnglish"))}
    </div>
  )
}

export default LocaleToggle

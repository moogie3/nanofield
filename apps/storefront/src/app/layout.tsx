import { getBaseURL } from "@lib/util/env"
import { isLocale } from "@lib/util/locale-path"
import { Metadata } from "next"
import { headers } from "next/headers"
import "styles/globals.css"
import { Outfit, Manrope } from "next/font/google"
import { cn } from "@/lib/utils"
import ConsoleSilencer from "@modules/common/components/console-silencer"
import { ThemeProvider } from "../components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
})

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" })

export async function generateMetadata(): Promise<Metadata> {
  // Root layout cannot read route params — locale arrives via the
  // middleware-set header (same source as <html lang> below).
  const headerStore = await headers()
  const headerLocale = headerStore.get("x-nanofield-locale")
  const lang = isLocale(headerLocale) ? headerLocale! : "id"
  const messages = (
    await import(`../messages/${lang}.json`)
  ).default as typeof import("../messages/en.json")
  return {
    metadataBase: new URL(getBaseURL()),
    title: messages.meta.siteTitle,
    description: messages.meta.siteDesc,
  }
}

export default async function RootLayout(props: {
  children: React.ReactNode
}) {
  // Locale comes from the URL (via middleware-set header); the root layout
  // cannot read route params, so the header is the source of truth.
  const headerStore = await headers()
  const headerLocale = headerStore.get("x-nanofield-locale")
  const lang = isLocale(headerLocale) ? headerLocale! : "id"

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={cn("font-sans", outfit.variable, manropeHeading.variable)}
    >
      <body className="bg-background text-foreground">
        <ConsoleSilencer />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <main className="relative">{props.children}</main>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

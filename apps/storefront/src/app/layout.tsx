import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { Outfit, Manrope } from "next/font/google"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "../components/theme-provider"

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
})

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: "Nanofield | Precision Electronic Components",
  description:
    "Indonesia's premier standalone store for electronic components, ICs, transistors, and appliance spare parts.",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", outfit.variable, manropeHeading.variable)}
    >
      <body className="bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <main className="relative">{props.children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}

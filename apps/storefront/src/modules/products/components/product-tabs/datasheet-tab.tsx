"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { getDatasheetInfo } from "@lib/util/product-datasheet"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

// Raw compliance keys — DatasheetTab maps them through product.compliance
// for display, and matches Badge variants on the raw keys (locale-proof).
type ComplianceKey =
  | "compliant"
  | "nonCompliant"
  | "yes"
  | "no"
  | "unknown"

const triState = (value: unknown): ComplianceKey =>
  value === "true" ? "compliant" : value === "false" ? "nonCompliant" : "unknown"

const yesNoUnknown = (value: unknown): ComplianceKey =>
  value === "true" ? "yes" : value === "false" ? "no" : "unknown"

const DatasheetTab = ({ product }: { product: HttpTypes.StoreProduct }) => {
  const t = useTranslations("product")
  const metadata = (product.metadata || {}) as Record<string, any>
  const datasheet = getDatasheetInfo(product)
  // Manufacturer part name first (e.g. TIP41C) — internal SKU codes mean
  // nothing to datasheet search. Import sets metadata.mpn per product.
  const partNumber = String(datasheet?.partLabel || product.title || "")
  const datasheetUrl = datasheet?.href || "#"

  // Only certified facts are shown — anything still unknown is hidden
  // instead of displayed as an "Unknown" badge wall. Compliance is
  // entered manually from manufacturer docs at import time; it is never
  // scraped or guessed (datasheet sites block bots and carry no license
  // for reuse).
  // Certified importer data stays raw; only the tri-state statuses use
  // locale-proof keys. Unknowns are hidden, never badge-walled.
  const complianceItems: { label: string; raw: string; display: string }[] = [
    { label: "RoHS", raw: triState(metadata.rohs), display: "" },
    { label: "REACH", raw: triState(metadata.reach), display: "" },
    { label: "Lead Free", raw: yesNoUnknown(metadata.lead_free), display: "" },
    {
      label: "Halogen Free",
      raw: yesNoUnknown(metadata.halogen_free),
      display: "",
    },
    {
      label: "MSL Level",
      raw:
        typeof metadata.msl === "string" && metadata.msl
          ? metadata.msl
          : "unknown",
      display: "",
    },
    {
      label: "ESD Rating",
      raw:
        typeof metadata.esd_rating === "string" && metadata.esd_rating
          ? metadata.esd_rating
          : "unknown",
      display: "",
    },
    {
      label: "UL Recognized",
      raw: yesNoUnknown(metadata.ul_recognized),
      display: "",
    },
    {
      label: "Country of Origin",
      raw: product.origin_country || metadata.country_of_origin || "unknown",
      display: "",
    },
  ]
    .filter((item) => item.raw !== "unknown")
    .map((item) => ({
      ...item,
      display:
        item.raw === "compliant" ||
        item.raw === "nonCompliant" ||
        item.raw === "yes" ||
        item.raw === "no" ||
        item.raw === "unknown"
          ? t(`compliance.${item.raw}`)
          : item.raw,
    }))

  // Direct-from-China sourcing: we are not in the authorized-distributor
  // channel, so distributor stock/pricing links (which convert our traffic
  // into their sales — and 404/0-result on obsolete Asian parts) are
  // deliberately absent. Documents only.
  const sources = [
    {
      label: metadata.datasheet_url
        ? t("openDatasheet")
        : t("findDatasheet", { part: partNumber }),
      note: "alldatasheet.com",
      href: datasheetUrl,
    },
  ]

  return (
    <div className="text-small-regular py-8 space-y-6">
      <div className="border border-border rounded-lg p-6 bg-muted/50">
        <h4 className="font-semibold text-foreground mb-4">{t("docs")}</h4>
        <div className="space-y-3">
          {sources.map((source) => (
            <a
              key={source.note}
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 border border-border rounded hover:bg-background transition-colors"
            >
              <svg
                className="w-5 h-5 text-primary flex-shrink-0 self-start mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm underline break-words">
                  {source.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {source.note}
                </span>
              </span>
            </a>
          ))}
          {metadata.application_note_url && (
            <a
              href={metadata.application_note_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 border border-border rounded hover:bg-background transition-colors"
            >
              <svg
                className="w-5 h-5 text-primary flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm underline">{t("appNote")}</span>
            </a>
          )}
          {metadata.cad_model_url && (
            <a
              href={metadata.cad_model_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 border border-border rounded hover:bg-background transition-colors"
            >
              <svg
                className="w-5 h-5 text-primary flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              <span className="text-sm underline">{t("cadModel")}</span>
            </a>
          )}
          {!datasheet &&
            !metadata.application_note_url &&
            !metadata.cad_model_url && (
              <p className="text-muted-foreground text-sm">
                {t("noDocs")}{" "}
                <LocalizedClientLink href="/contact" className="underline">
                  {t("askTeam")}
                </LocalizedClientLink>
              </p>
            )}
        </div>
      </div>

      {complianceItems.length > 0 && (
        <div className="border border-border rounded-lg p-6 bg-muted/50">
          <h4 className="font-semibold text-foreground mb-1">
            {t("complianceTitle")}
          </h4>
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {t("complianceNote")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {complianceItems.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-2 border-b border-border/50 last:border-0"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <Badge
                    variant={
                      item.raw === "compliant" || item.raw === "yes"
                        ? "default"
                        : item.raw === "nonCompliant" || item.raw === "no"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {item.display}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        </div>
      )}

      <div className="border border-border rounded-lg p-6 bg-muted/50">
        <h4 className="font-semibold text-foreground mb-4">
          {t("crossRef")}
        </h4>
        <div className="space-y-2">
          {metadata.cross_references ? (
            <div className="flex flex-wrap gap-2">
              {metadata.cross_references.split(",").map((ref: string, i: number) => (
                <Badge key={i} variant="secondary">
                  {ref.trim()}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("noCrossRef")}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DatasheetTab

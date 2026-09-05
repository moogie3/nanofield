"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getDatasheetInfo } from "@lib/util/product-datasheet"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

// Typed read of the loose product metadata bag. Anything that isn't a
// non-empty string counts as missing — never render raw `unknown` into JSX.
const metaStr = (
  metadata: Record<string, unknown> | null | undefined,
  key: string,
  fallback = "-"
) => {
  const value = metadata?.[key]
  return typeof value === "string" && value ? value : fallback
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  // Same rule as the gallery button: explicit datasheet_url always wins,
  // `no_datasheet` opts out (hand tools, consumables), otherwise a
  // searchable identifier falls back to a datasheet search link.
  const hasDatasheet = getDatasheetInfo(product) !== null
  const tabs = [
    {
      label: "Specifications",
      component: <SpecificationsTab product={product} />,
    },
    ...(hasDatasheet
      ? [
          {
            label: "Datasheet & Sourcing",
            component: <DatasheetTab product={product} />,
          },
        ]
      : []),
    {
      label: "Shipping & Returns",
      component: <ShippingInfoTab />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple" defaultValue={["Specifications"]}>
        {tabs.map((tab) => (
          <AccordionItem key={tab.label} value={tab.label}>
            <AccordionTrigger>{tab.label}</AccordionTrigger>
            <AccordionContent>{tab.component}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

const SpecificationsTab = ({ product }: ProductTabsProps) => {
  // Extract specs from metadata - these would be populated from your import script
  const metadata = product.metadata
  const specs: Record<string, string> = {
    "Part Number": product.handle?.toUpperCase() || "-",
    Manufacturer: metaStr(metadata, "manufacturer"),
    Category: product.type?.value || metaStr(metadata, "category"),
    "Package / Case": metaStr(metadata, "package_case"),
    "Mounting Type": metaStr(metadata, "mounting_type"),
    "Operating Temperature": metaStr(metadata, "operating_temp"),
    "Voltage Rating":
      metaStr(metadata, "voltage_rating", "") !== ""
        ? `${metaStr(metadata, "voltage_rating")}V`
        : "-",
    "Current Rating":
      metaStr(metadata, "current_rating", "") !== ""
        ? `${metaStr(metadata, "current_rating")}A`
        : "-",
    "Power Dissipation":
      metaStr(metadata, "power_dissipation", "") !== ""
        ? `${metaStr(metadata, "power_dissipation")}W`
        : "-",
    Frequency:
      metaStr(metadata, "frequency", "") !== ""
        ? `${metaStr(metadata, "frequency")}MHz`
        : "-",
    "Gain (hFE)": metaStr(metadata, "gain"),
    Capacitance:
      metaStr(metadata, "capacitance", "") !== ""
        ? `${metaStr(metadata, "capacitance")}pF`
        : "-",
    Resistance:
      metaStr(metadata, "resistance", "") !== ""
        ? `${metaStr(metadata, "resistance")}Ω`
        : "-",
    Inductance:
      metaStr(metadata, "inductance", "") !== ""
        ? `${metaStr(metadata, "inductance")}µH`
        : "-",
    "RoHS Status":
      metadata?.rohs === "true"
        ? "Compliant"
        : metadata?.rohs === "false"
          ? "Non-Compliant"
          : "-",
    "Lead Free":
      metadata?.lead_free === "true"
        ? "Yes"
        : metadata?.lead_free === "false"
          ? "No"
          : "-",
    Weight: product.weight ? `${product.weight} g` : "-",
    "Dimensions (L×W×H)":
      product.length && product.width && product.height
        ? `${product.length} × ${product.width} × ${product.height} mm`
        : "-",
    "Stock Status": metaStr(metadata, "stock_status", "In Stock"),
    "Moisture Sensitivity Level": metaStr(metadata, "msl"),
    "ESD Rating": metaStr(metadata, "esd_rating"),
  }

  // Filter out empty specs
  const displaySpecs = Object.entries(specs).filter(
    ([_, value]) => value && value !== "-",
  )

  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
        {displaySpecs.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {label}
            </span>
            <span className="font-medium text-foreground select-all">
              {value}
            </span>
          </div>
        ))}
      </div>
      {displaySpecs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium">No detailed specifications available</p>
          <p className="text-sm mt-1">
            Contact our technical team for datasheet requests.
          </p>
        </div>
      )}
    </div>
  )
}

const triState = (value: unknown, yes = "Compliant", no = "Non-Compliant") =>
  value === "true" ? yes : value === "false" ? no : "Unknown"

const yesNoUnknown = (value: unknown) =>
  value === "true" ? "Yes" : value === "false" ? "No" : "Unknown"

const DatasheetTab = ({ product }: ProductTabsProps) => {
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
  const complianceItems = [
    { label: "RoHS", value: triState(metadata.rohs) },
    { label: "REACH", value: triState(metadata.reach) },
    { label: "Lead Free", value: yesNoUnknown(metadata.lead_free) },
    { label: "Halogen Free", value: yesNoUnknown(metadata.halogen_free) },
    {
      label: "MSL Level",
      value:
        typeof metadata.msl === "string" && metadata.msl ? metadata.msl : "Unknown",
    },
    {
      label: "ESD Rating",
      value:
        typeof metadata.esd_rating === "string" && metadata.esd_rating
          ? metadata.esd_rating
          : "Unknown",
    },
    { label: "UL Recognized", value: yesNoUnknown(metadata.ul_recognized) },
    {
      label: "Country of Origin",
      value:
        product.origin_country || metadata.country_of_origin || "Unknown",
    },
  ].filter((item) => item.value !== "Unknown")

  const mpnQuery = encodeURIComponent(String(partNumber))
  const sources = [
    {
      label: metadata.datasheet_url
        ? "Open Datasheet"
        : `Find ${partNumber} datasheet`,
      note: "alldatasheet.com",
      href: datasheetUrl,
    },
    {
      label: `Check ${partNumber} stock & pricing`,
      note: "digikey.com",
      href: `https://www.digikey.com/en/products/result?keywords=${mpnQuery}`,
    },
    {
      label: `Check ${partNumber} stock & pricing`,
      note: "mouser.com",
      href: `https://www.mouser.com/c/?q=${mpnQuery}`,
    },
    {
      label: `Check ${partNumber} stock & pricing`,
      note: "lcsc.com",
      href: `https://www.lcsc.com/search?q=${mpnQuery}`,
    },
  ]

  return (
    <div className="text-small-regular py-8 space-y-6">
      <div className="border border-border rounded-lg p-6 bg-muted/50">
        <h4 className="font-semibold text-foreground mb-4">
          Datasheets & Distributors
        </h4>
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
                className="w-5 h-5 text-primary flex-shrink-0"
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
              <span className="text-sm underline flex-1 min-w-0 break-words">{source.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                {source.note}
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
              <span className="text-sm underline">Application Note</span>
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
              <span className="text-sm underline">
                3D CAD Model (STEP/IGES)
              </span>
            </a>
          )}
          {!metadata.datasheet_url &&
            !metadata.application_note_url &&
            !metadata.cad_model_url && (
              <p className="text-muted-foreground text-sm">
                No technical documents linked for this part. Request from
                supplier portal.
              </p>
            )}
        </div>
      </div>

      <div className="border border-border rounded-lg p-6 bg-muted/50">
        <h4 className="font-semibold text-foreground mb-1">
          Compliance & Certifications
        </h4>
        {complianceItems.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              Sourced from the manufacturer datasheet — always confirm against
              the official datasheet linked above before production use.
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
                      item.value === "Compliant" || item.value === "Yes"
                        ? "default"
                        : item.value === "Non-Compliant" || item.value === "No"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {item.value}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Compliance data is still pending for this part. Values are added
            from manufacturer documentation during catalog import — nothing
            here is a guess.
          </p>
        )}
      </div>

      <div className="border border-border rounded-lg p-6 bg-muted/50">
        <h4 className="font-semibold text-foreground mb-4">
          Cross References & Alternatives
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
              No cross-references documented.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const ShippingInfoTab = () => {
  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-1 gap-y-8">
        <div className="flex items-start gap-x-2">
          <FastDelivery />
          <div>
            <span className="font-semibold">Fast delivery</span>
            <p className="max-w-sm">
              Your package will arrive in 3-5 business days at your pick up
              location or in the comfort of your home.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Refresh />
          <div>
            <span className="font-semibold">Simple exchanges</span>
            <p className="max-w-sm">
              Is the fit not quite right? No worries - we&apos;ll exchange your
              product for a new one.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Back />
          <div>
            <span className="font-semibold">Easy returns</span>
            <p className="max-w-sm">
              Just return your product and we&apos;ll refund your money. No
              questions asked – we&apos;ll do our best to make sure your return
              is hassle-free.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs

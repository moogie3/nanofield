"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const tabs = [
    {
      label: "Specifications",
      component: <SpecificationsTab product={product} />,
    },
    {
      label: "Datasheet & Compliance",
      component: <DatasheetTab product={product} />,
    },
    {
      label: "Shipping & Returns",
      component: <ShippingInfoTab />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab, i) => (
          <Accordion.Item
            key={i}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const SpecificationsTab = ({ product }: ProductTabsProps) => {
  const metadata = product.metadata || {}

  // Extract specs from metadata - these would be populated from your import script
  const specs = {
    "Part Number": product.handle?.toUpperCase() || "-",
    Manufacturer: metadata.manufacturer || "-",
    Category: product.type?.value || metadata.category || "-",
    "Package / Case": metadata.package_case || "-",
    "Mounting Type": metadata.mounting_type || "-",
    "Operating Temperature": metadata.operating_temp || "-",
    "Voltage Rating": metadata.voltage_rating
      ? `${metadata.voltage_rating}V`
      : "-",
    "Current Rating": metadata.current_rating
      ? `${metadata.current_rating}A`
      : "-",
    "Power Dissipation": metadata.power_dissipation
      ? `${metadata.power_dissipation}W`
      : "-",
    Frequency: metadata.frequency ? `${metadata.frequency}MHz` : "-",
    "Gain (hFE)": metadata.gain || "-",
    Capacitance: metadata.capacitance ? `${metadata.capacitance}pF` : "-",
    Resistance: metadata.resistance ? `${metadata.resistance}Ω` : "-",
    Inductance: metadata.inductance ? `${metadata.inductance}µH` : "-",
    "RoHS Status":
      metadata.rohs === "true"
        ? "Compliant"
        : metadata.rohs === "false"
          ? "Non-Compliant"
          : "-",
    "Lead Free":
      metadata.lead_free === "true"
        ? "Yes"
        : metadata.lead_free === "false"
          ? "No"
          : "-",
    Weight: product.weight ? `${product.weight} g` : "-",
    "Dimensions (L×W×H)":
      product.length && product.width && product.height
        ? `${product.length} × ${product.width} × ${product.height} mm`
        : "-",
    "Stock Status": metadata.stock_status || "In Stock",
    "Moisture Sensitivity Level": metadata.msl || "-",
    "ESD Rating": metadata.esd_rating || "-",
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

const DatasheetTab = ({ product }: ProductTabsProps) => {
  const metadata = product.metadata || {}

  return (
    <div className="text-small-regular py-8 space-y-6">
      <div className="border border-border rounded-lg p-6 bg-muted/50">
        <h4 className="font-semibold text-foreground mb-4">
          Technical Documentation
        </h4>
        <div className="space-y-3">
          {metadata.datasheet_url && (
            <a
              href={metadata.datasheet_url}
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
              <span className="text-sm underline">
                Download Datasheet (PDF)
              </span>
            </a>
          )}
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
        <h4 className="font-semibold text-foreground mb-4">
          Compliance & Certifications
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              label: "RoHS",
              value:
                metadata.rohs === "true"
                  ? "Compliant"
                  : metadata.rohs === "false"
                    ? "Non-Compliant"
                    : "Unknown",
            },
            {
              label: "REACH",
              value:
                metadata.reach === "true"
                  ? "Compliant"
                  : metadata.reach === "false"
                    ? "Non-Compliant"
                    : "Unknown",
            },
            {
              label: "Lead Free",
              value:
                metadata.lead_free === "true"
                  ? "Yes"
                  : metadata.lead_free === "false"
                    ? "No"
                    : "Unknown",
            },
            {
              label: "Halogen Free",
              value:
                metadata.halogen_free === "true"
                  ? "Yes"
                  : metadata.halogen_free === "false"
                    ? "No"
                    : "Unknown",
            },
            { label: "MSL Level", value: metadata.msl || "Not Specified" },
            {
              label: "ESD Rating",
              value: metadata.esd_rating || "Not Specified",
            },
            {
              label: "UL Recognized",
              value:
                metadata.ul_recognized === "true"
                  ? "Yes"
                  : metadata.ul_recognized === "false"
                    ? "No"
                    : "Unknown",
            },
            {
              label: "Country of Origin",
              value:
                product.origin_country ||
                metadata.country_of_origin ||
                "Unknown",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex justify-between py-2 border-b border-border/50 last:border-0"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-lg p-6 bg-muted/50">
        <h4 className="font-semibold text-foreground mb-4">
          Cross References & Alternatives
        </h4>
        <div className="space-y-2">
          {metadata.cross_references ? (
            <div>
              {metadata.cross_references.split(",").map((ref, i) => (
                <span
                  key={i}
                  className="inline-block px-3 py-1 text-sm bg-primary/10 text-primary border border-primary/20 rounded mr-2 mb-2"
                >
                  {ref.trim()}
                </span>
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

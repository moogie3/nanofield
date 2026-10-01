"use client"

import { useTranslations } from "next-intl"
import { HttpTypes } from "@medusajs/types"

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

const SpecificationsTab = ({
  product,
}: {
  product: HttpTypes.StoreProduct
}) => {
  const t = useTranslations("product")
  // Extract specs from metadata - these would be populated from your import script
  const metadata = product.metadata
  // Same truth as the buy button: any purchasable variant means In Stock.
  // An explicit metadata stock_status still wins when the importer sets one.
  const explicitStock = metaStr(metadata, "stock_status", "")
  const anyInStock = (product.variants || []).some(
    (v) =>
      v.allow_backorder ||
      (typeof v.inventory_quantity === "number" && v.inventory_quantity > 0)
  )
  // Importer-provided status strings are data (left as-is); computed
  // statuses use raw keys mapped through product.compliance below.
  const stockStatus = explicitStock
    ? explicitStock
    : anyInStock
      ? t("compliance.inStock")
      : t("compliance.outOfStock")
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
        ? t("compliance.compliant")
        : metadata?.rohs === "false"
          ? t("compliance.nonCompliant")
          : "-",
    "Lead Free":
      metadata?.lead_free === "true"
        ? t("compliance.yes")
        : metadata?.lead_free === "false"
          ? t("compliance.no")
          : "-",
    Weight: product.weight ? `${product.weight} g` : "-",
    "Dimensions (L×W×H)":
      product.length && product.width && product.height
        ? `${product.length} × ${product.width} × ${product.height} mm`
        : "-",
    "Stock Status": stockStatus,
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
          <p className="font-medium">{t("noSpecs")}</p>
          <p className="text-sm mt-1">{t("specsContact")}</p>
        </div>
      )}
    </div>
  )
}

export default SpecificationsTab

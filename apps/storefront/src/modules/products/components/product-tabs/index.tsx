"use client"

import { useTranslations } from "next-intl"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { getDatasheetInfo } from "@lib/util/product-datasheet"
import { HttpTypes } from "@medusajs/types"
import DatasheetTab from "./datasheet-tab"
import ShippingInfoTab from "./shipping-tab"
import SpecificationsTab from "./specifications-tab"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const t = useTranslations("product")
  // Same rule as the gallery button: explicit datasheet_url always wins,
  // `no_datasheet` opts out (hand tools, consumables), otherwise a
  // searchable identifier falls back to a datasheet search link.
  const hasDatasheet = getDatasheetInfo(product) !== null
  const tabs = [
    {
      label: t("tabs.specifications"),
      component: <SpecificationsTab product={product} />,
    },
    ...(hasDatasheet
      ? [
          {
            label: t("tabs.datasheet"),
            component: <DatasheetTab product={product} />,
          },
        ]
      : []),
    {
      label: t("tabs.shipping"),
      component: <ShippingInfoTab />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple" defaultValue={[tabs[0].label]}>
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

export default ProductTabs

"use client"

import { useTranslations } from "next-intl"
import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

const ShippingInfoTab = () => {
  const t = useTranslations("product")
  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-1 gap-y-8">
        <div className="flex items-start gap-x-2">
          <FastDelivery />
          <div>
            <span className="font-semibold">{t("fastDelivery")}</span>
            <p className="max-w-sm">{t("fastDeliveryBody")}</p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Refresh />
          <div>
            <span className="font-semibold">{t("exchanges")}</span>
            <p className="max-w-sm">{t("exchangesBody")}</p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Back />
          <div>
            <span className="font-semibold">{t("returns")}</span>
            <p className="max-w-sm">{t("returnsBody")}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShippingInfoTab

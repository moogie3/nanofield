import { getTranslations } from "next-intl/server"
import { Heading } from "@modules/common/components/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import React from "react"

const Help = async () => {
  const t = await getTranslations("order")
  return (
    <div className="mt-6">
      <Heading className="text-base-semi">{t("helpTitle")}</Heading>
      <div className="text-base-regular my-2">
        <ul className="gap-y-2 flex flex-col">
          <li>
            <InteractiveLink href="/contact">
              {t("helpContact")}
            </InteractiveLink>
          </li>
          <li>
            <InteractiveLink href="/returns">
              {t("helpReturns")}
            </InteractiveLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help

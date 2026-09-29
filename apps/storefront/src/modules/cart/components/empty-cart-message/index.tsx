import { getTranslations } from "next-intl/server"
import { Heading, Text } from "@modules/common/components/ui"
import { Button } from "@/components/ui/button"
import { SectionIcon } from "@modules/layout/components/nav-icons"
import { PackageIcon } from "@hugeicons/core-free-icons"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

const EmptyCartMessage = async () => {
  const t = await getTranslations("cart")
  return (
    <div
      className="py-48 px-2 flex flex-col justify-center items-start"
      data-testid="empty-cart-message"
    >
      <div className="flex items-center gap-3">
        <SectionIcon icon={PackageIcon} className="h-8 w-8 shrink-0 text-primary" />
        <Heading
          level="h1"
          className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
        >
          {t("emptyTitle")}
        </Heading>
      </div>
      <Text className="text-base-regular mt-4 mb-6 max-w-[32rem]">
        {t("emptyBody")}
      </Text>
      <div>
        <Button asChild>
          <LocalizedClientLink href="/store">
            {t("explore")}
          </LocalizedClientLink>
        </Button>
      </div>
    </div>
  )
}

export default EmptyCartMessage

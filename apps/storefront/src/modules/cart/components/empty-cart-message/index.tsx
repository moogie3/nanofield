import { Heading, Text } from "@modules/common/components/ui"
import { Button } from "@/components/ui/button"
import { SectionIcon } from "@modules/layout/components/nav-icons"
import { PackageIcon } from "@hugeicons/core-free-icons"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

const EmptyCartMessage = () => {
  return (
    <div
      className="py-48 px-2 flex flex-col justify-center items-start"
      data-testid="empty-cart-message"
    >
      <SectionIcon icon={PackageIcon} className="h-10 w-10 text-primary mb-4" />
      <Heading
        level="h1"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
      >
        Cart
      </Heading>
      <Text className="text-base-regular mt-4 mb-6 max-w-[32rem]">
        You don&apos;t have anything in your cart. Let&apos;s change that, use
        the link below to start browsing our products.
      </Text>
      <div>
        <Button asChild>
          <LocalizedClientLink href="/store">
            Explore products
          </LocalizedClientLink>
        </Button>
      </div>
    </div>
  )
}

export default EmptyCartMessage

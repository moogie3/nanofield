import { Text, clx } from "@modules/common/components/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({
  price,
  className,
}: {
  price: VariantPrice
  className?: string
}) {
  if (!price) {
    return null
  }

  return (
    <>
      {price.price_type === "sale" && (
        <Text
          className="line-through text-ui-fg-muted"
          data-testid="original-price"
        >
          {price.original_price}
        </Text>
      )}
      <Text
        className={clx(
          // Card prices never wrap: long IDR amounts (100.000+) otherwise
          // push the quick-add button out of alignment.
          "whitespace-nowrap tabular-nums text-ui-fg-muted",
          {
            "text-ui-fg-interactive": price.price_type === "sale",
          },
          className
        )}
        data-testid="price"
      >
        {price.calculated_price}
      </Text>
    </>
  )
}

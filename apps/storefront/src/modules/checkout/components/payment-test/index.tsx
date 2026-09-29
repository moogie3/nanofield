import { useTranslations } from "next-intl"
import { Badge } from "@modules/common/components/ui"

const PaymentTest = ({ className }: { className?: string }) => {
  const t = useTranslations("checkout")
  return (
    <Badge color="orange" className={className}>
      {t("testBadge")}
    </Badge>
  )
}

export default PaymentTest

import { getLocale, getTranslations } from "next-intl/server"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

// Backend status enums → translated labels. Unknown future values fall back
// to the formatted raw enum (English) rather than crashing.
const STATUS_KEYS = [
  "notFulfilled",
  "partiallyFulfilled",
  "fulfilled",
  "partiallyShipped",
  "shipped",
  "partiallyDelivered",
  "delivered",
  "canceled",
  "requiresAction",
  "notPaid",
  "awaiting",
  "authorized",
  "partiallyAuthorized",
  "captured",
  "partiallyCaptured",
  "refunded",
  "partiallyRefunded",
] as const

const toCamel = (snake: string) =>
  snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

const OrderDetails = async ({ order, showStatus }: OrderDetailsProps) => {
  const t = await getTranslations("order")
  const localeTag = (await getLocale()) === "id" ? "id-ID" : "en-US"

  const formatStatus = (str: string) => {
    const key = toCamel(str)
    if ((STATUS_KEYS as readonly string[]).includes(key)) {
      return t(`status.${key}`)
    }
    const formatted = str.split("_").join(" ")
    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  return (
    <div>
      <div className="flex items-center gap-x-4">
        <Text className="text-ui-fg-interactive">
          {t("orderId")}{" "}
          <span data-testid="order-raw-id" className="font-mono text-sm">{order.id}</span>
        </Text>
        <Text className="text-xs text-ui-fg-subtle">
          {t("orderNumber")}{" "}
          <span data-testid="order-id">#{order.display_id}</span>
        </Text>
      </div>
      <Text>
        {t("orderDate")}{" "}
        <span data-testid="order-date">
          {new Date(order.created_at).toLocaleDateString(localeTag, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </Text>

      <div className="flex items-center text-compact-small gap-x-4 mt-4">
        {showStatus && (
          <>
            <Text>
              {t("orderStatus")}{" "}
              <span className="text-ui-fg-subtle " data-testid="order-status">
                {formatStatus(order.fulfillment_status)}
              </span>
            </Text>
            <Text>
              {t("paymentStatus")}{" "}
              <span
                className="text-ui-fg-subtle "
                sata-testid="order-payment-status"
              >
                {formatStatus(order.payment_status)}
              </span>
            </Text>
          </>
        )}
      </div>
      <Text className="text-ui-fg-subtle">
        {t("confirmationSent", { email: order.email })}
      </Text>
    </div>
  )
}

export default OrderDetails

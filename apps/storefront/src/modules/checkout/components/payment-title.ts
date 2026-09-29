import { isManual, isMidtrans, isStripeLike } from "@lib/constants"

// Display title for a payment provider id. Brand names (PayPal, iDeal,
// Bancontact) pass through untouched; generic method names are translated.
// Falls back to the static map title, then the raw provider id.
export function getPaymentTitle(
  providerId: string | undefined,
  t: (key: "card" | "manual" | "midtrans") => string,
  fallback?: string
): string {
  if (!providerId) {
    return fallback ?? ""
  }
  if (isStripeLike(providerId)) {
    return t("card")
  }
  if (isManual(providerId)) {
    return t("manual")
  }
  if (isMidtrans(providerId)) {
    return t("midtrans")
  }
  return fallback ?? providerId
}

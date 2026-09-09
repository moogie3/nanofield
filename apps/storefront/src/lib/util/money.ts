import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

// Currencies without minor units (Indonesian Rupiah has no cents).
// Fraction digits are pinned explicitly because the Intl default for a
// currency can differ between the server's and the browser's ICU data,
// which otherwise produces hydration mismatches (server "IDR 15,000"
// versus client "IDR 15,000.00").
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "idr",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
])

export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  if (!currency_code || isEmpty(currency_code)) {
    return amount.toString()
  }

  const zeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency_code.toLowerCase())

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency_code,
    minimumFractionDigits: minimumFractionDigits ?? (zeroDecimal ? 0 : 2),
    maximumFractionDigits: maximumFractionDigits ?? (zeroDecimal ? 0 : 2),
  }).format(amount)
}

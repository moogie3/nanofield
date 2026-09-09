type MedusaError = {
  response?: {
    data: { message?: string } | string
    status: number
    headers: unknown
  }
  request?: unknown
  message?: string
  config?: { url: string; baseURL: string }
}

// Raw backend messages ("Some variant does not have the required
// inventory") mean nothing to a shopper. Translate the known ones here so
// every surface (cart, checkout, quick-add) speaks plainly.
const FRIENDLY_MESSAGES: [RegExp, string][] = [
  [
    /some variant does not have the required inventory/i,
    "Not enough stock available — please lower the quantity.",
  ],
]

const friendlyMessage = (message: string): string => {
  for (const [pattern, text] of FRIENDLY_MESSAGES) {
    if (pattern.test(message)) {
      return text
    }
  }
  return message
}

export default function medusaError(error: unknown): never {
  const err = error as MedusaError
  if (err.response) {
    const u = new URL(err.config?.url ?? "", err.config?.baseURL ?? "")
    console.error("Resource:", u.toString())
    console.error("Response data:", err.response.data)
    console.error("Status code:", err.response.status)
    console.error("Headers:", err.response.headers)

    const data = err.response.data
    const raw =
      typeof data === "object" && data !== null
        ? data.message || String(data)
        : data
    const friendly = friendlyMessage(raw)
    throw new Error(
      friendly === raw
        ? friendly.charAt(0).toUpperCase() + friendly.slice(1) + "."
        : friendly
    )
  } else if (err.request) {
    throw new Error("No response received: " + String(err.request))
  } else {
    throw new Error(friendlyMessage("Error setting up the request: " + err.message))
  }
}

import { MedusaError } from "@medusajs/framework/utils"

// Real-time AWB tracking against the Komerce V2 API
// (POST track/waybill — same host/key conventions as the quote calls in
// service.ts). Tolerant parsing throughout: unknown shapes resolve to
// "not delivered", never throw. Transport/meta failures DO throw so the
// caller can count the wasted quota hit and move on.
export type TrackWaybillInput = {
  baseUrl: string
  apiKey: string
  awb: string
  courier: string
  // JNE requires the last 5 digits of the receiver phone for validation.
  lastPhone?: string
  timeoutMs?: number
}

export type TrackResult = {
  delivered: boolean
  // Raw courier status text when the API provides one (debug only).
  status?: string
}

export const trackWaybill = async ({
  baseUrl,
  apiKey,
  awb,
  courier,
  lastPhone,
  timeoutMs = 10000,
}: TrackWaybillInput): Promise<TrackResult> => {
  const params = new URLSearchParams({ awb, courier })
  if (lastPhone) {
    params.set("last_phone_number", lastPhone)
  }
  const res = await fetch(
    `${baseUrl.replace(/\/$/, "")}/track/waybill?${params}`,
    {
      method: "POST",
      headers: { key: apiKey },
      signal: AbortSignal.timeout(timeoutMs),
    }
  )
  if (!res.ok) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `track waybill failed: HTTP ${res.status}`
    )
  }
  const json = (await res.json()) as {
    meta?: { message?: string; status?: string }
    data?: {
      delivered?: unknown
      summary?: { pod_status?: unknown; status?: unknown }
      [key: string]: unknown
    }
  }
  if (
    typeof json.meta?.status === "string" &&
    !/success|ok/i.test(json.meta.status)
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `track waybill failed: ${json.meta.message ?? json.meta.status}`
    )
  }
  const data = json.data
  const summary = data?.summary
  const statusText = [summary?.pod_status, summary?.status]
    .find((v) => typeof v === "string") as string | undefined
  return {
    delivered: data?.delivered === true,
    ...(statusText ? { status: statusText } : {}),
  }
}

// Catalog stamps clean codes ("jne", "jnt") on fulfillment data, but be
// liberal: anything unrecognized is skipped by the caller, never guessed.
export const normalizeCourier = (raw: unknown): string | null => {
  if (typeof raw !== "string") {
    return null
  }
  const code = raw.toLowerCase().replace(/[^a-z]/g, "")
  if (code === "jne") {
    return "jne"
  }
  if (code === "jnt" || code === "jt") {
    return "jnt"
  }
  return null
}

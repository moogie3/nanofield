import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

export type SenderProfileRow = {
  id: string
  name: string
  phone: string
  address_1: string
  city: string
  province: string
  country_code: string
}

type SenderProfileOps = {
  listSenderProfiles: () => Promise<SenderProfileRow[]>
  createSenderProfiles: (
    data: Record<string, unknown>
  ) => Promise<SenderProfileRow>
  updateSenderProfiles: (
    data: Record<string, unknown>[]
  ) => Promise<SenderProfileRow[]>
}

const SENDER_KEYS = ["sender_profile", "senderProfileModuleService"]

const senderProfiles = (req: MedusaRequest): SenderProfileOps => {
  const resolve = req.scope.resolve as unknown as (
    key: string
  ) => SenderProfileOps | null
  for (const key of SENDER_KEYS) {
    try {
      const svc = resolve(key)
      if (svc && typeof svc.listSenderProfiles === "function") {
        return svc
      }
    } catch {
      // try the next key
    }
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "sender-profile module is not loaded"
  )
}

// Env-backed defaults: a fresh database with no row still prints labels.
export const senderDefaults = () => ({
  name: process.env.STORE_NAME || "Nanofield",
  phone: process.env.STORE_PHONE || "+62 851-2155-0532",
  address_1: process.env.STORE_ADDRESS_1 || "Pasar Jambi",
  city: process.env.STORE_CITY || "Jambi",
  province: process.env.STORE_PROVINCE || "Jambi",
  country_code: process.env.STORE_COUNTRY_CODE || "id",
})

// Singleton read: first row wins, defaults when none.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rows = await senderProfiles(req).listSenderProfiles()
  res.status(200).json({ sender: rows[0] ? toPayload(rows[0]) : senderDefaults() })
}

// Singleton upsert: creates the row once, updates it after. All fields
// required — the admin form always sends the full block.
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as Record<string, unknown>
  const str = (v: unknown, max: number): string =>
    String(v ?? "").trim().slice(0, max)
  const data = {
    name: str(body.name, 120),
    phone: str(body.phone, 40),
    address_1: str(body.address_1, 200),
    city: str(body.city, 100),
    province: str(body.province, 100),
    country_code: str(body.country_code, 10).toLowerCase(),
  }
  if (!data.name || !data.phone || !data.address_1 || !data.city) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "name, phone, address_1 and city are required"
    )
  }
  const ops = senderProfiles(req)
  const existing = (await ops.listSenderProfiles())[0]
  const saved = existing
    ? (await ops.updateSenderProfiles([{ id: existing.id, ...data }]))[0]
    : await ops.createSenderProfiles(data)
  res.status(200).json({ sender: toPayload(saved) })
}

const toPayload = (r: SenderProfileRow) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  address_1: r.address_1,
  city: r.city,
  province: r.province,
  country_code: r.country_code,
})

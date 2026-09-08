import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  BUILT_IN_SERVICES,
  mergeCatalog,
  type ShippingServiceRow,
} from "../../../modules/rajaongkir/catalog"

type CatalogOps = {
  listShippingServices: (
    filters?: Record<string, unknown>
  ) => Promise<ShippingServiceRow[]>
  createShippingServices: (
    data: Record<string, unknown>
  ) => Promise<ShippingServiceRow>
  updateShippingServices: (
    data: Record<string, unknown>[]
  ) => Promise<ShippingServiceRow[]>
}

const CATALOG_KEYS = ["rajaongkir", "rajaongkirModuleService"]

const catalog = (req: MedusaRequest): CatalogOps => {
  const resolve = req.scope.resolve as unknown as (
    key: string
  ) => CatalogOps | null
  for (const key of CATALOG_KEYS) {
    try {
      const svc = resolve(key)
      if (svc && typeof svc.listShippingServices === "function") {
        return svc
      }
    } catch {
      // try the next key
    }
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "rajaongkir catalog module is not loaded"
  )
}

const parseRow = (body: Record<string, unknown>) => {
  const str = (v: unknown): string =>
    typeof v === "string" ? v.trim() : ""
  const code = str(body.code).toLowerCase()
  if (!/^[a-z0-9-]{2,40}$/.test(code)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "code must be 2-40 chars of a-z, 0-9, dash (e.g. sicepat-reg)"
    )
  }
  const courier = str(body.courier).toLowerCase()
  const serviceCode = str(body.service_code).toUpperCase()
  const label = str(body.label)
  if (!courier || !serviceCode || !label) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "courier, service_code and label are required"
    )
  }
  return {
    code,
    courier,
    service_code: serviceCode,
    label,
    cheapest_match: body.cheapest_match === true,
    is_enabled: body.is_enabled !== false,
  }
}

// Merged catalog: built-ins overlaid with admin rows. `rows` carries every
// manageable entry with its enabled flag (disabled included, so the UI can
// re-enable); `services` is the live quoting set. Built-ins can only be
// disabled, never deleted — customs may be deleted.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dbRows = await catalog(req).listShippingServices({})
  const list = Array.isArray(dbRows) ? dbRows : []
  const { services } = mergeCatalog(list)
  const byCode = new Map(list.map((r) => [r.code, r]))
  const rows = [
    ...BUILT_IN_SERVICES.map((b) => {
      const row = byCode.get(b.id)
      byCode.delete(b.id)
      return {
        code: b.id,
        courier: row?.courier ?? b.courier,
        service_code: row?.service_code ?? b.service,
        label: row?.label ?? b.name,
        cheapest_match: row?.cheapest_match ?? b.anyService === true,
        is_enabled: row?.is_enabled ?? b.defaultEnabled !== false,
        built_in: true,
      }
    }),
    ...[...byCode.values()].map((row) => ({
      code: row.code,
      courier: row.courier,
      service_code: row.service_code,
      label: row.label,
      cheapest_match: row.cheapest_match,
      is_enabled: row.is_enabled,
      built_in: false,
    })),
  ]
  res.status(200).json({
    rows,
    services: services.map((s) => ({
      id: s.id,
      courier: s.courier,
      service: s.service,
      name: s.name,
      cheapest_match: s.anyService === true,
    })),
  })
}

// Upsert by code: unknown codes create custom services, known codes
// (built-in or custom) update in place. Never deletes.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const data = parseRow((req.body || {}) as Record<string, unknown>)
  const ops = catalog(req)
  const existing = (await ops.listShippingServices({ code: data.code })).find(
    (r) => r.code === data.code
  )
  if (existing) {
    const [updated] = await ops.updateShippingServices([
      { id: existing.id, ...data },
    ])
    res.status(200).json({ service: updated })
    return
  }
  const created = await ops.createShippingServices(data)
  res.status(200).json({ service: created })
}

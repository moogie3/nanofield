import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  BUILT_IN_SERVICES,
  type ShippingServiceRow,
} from "../../../../modules/rajaongkir/catalog"

type CatalogOps = {
  listShippingServices: (
    filters?: Record<string, unknown>
  ) => Promise<ShippingServiceRow[]>
  deleteShippingServices: (ids: string[]) => Promise<void>
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

const builtInCodes = new Set(BUILT_IN_SERVICES.map((s) => s.id))

// Deletes custom services only. Built-ins are protected: disable them
// instead (POST the same code with is_enabled=false).
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const code = String(req.params.id || "")
  if (builtInCodes.has(code)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `${code} is built-in: disable it instead of deleting (POST is_enabled=false)`
    )
  }
  const ops = catalog(req)
  const existing = (await ops.listShippingServices({ code })).find(
    (r) => r.code === code
  )
  if (!existing) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `no custom service with code ${code}`
    )
  }
  await ops.deleteShippingServices([existing.id])
  res.status(200).json({ deleted: code })
}

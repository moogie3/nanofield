import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

// Audit retention: deletes audit rows older than AUDIT_RETENTION_DAYS
// (default 90, daily 03:30). Same rationale as feed retention — old rows
// have no readers (the audit page is newest-first) and the table is
// write-heavy. Set AUDIT_RETENTION_DAYS=0 to disable. A run never throws.
const retentionDays = () => {
  const n = Number(process.env.AUDIT_RETENTION_DAYS ?? 90)
  if (!Number.isFinite(n) || n < 0) {
    return 90
  }
  return Math.floor(n)
}

type AuditRow = { id: string; created_at?: string }

export default async function auditRetentionJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const days = retentionDays()
    if (days === 0) {
      return
    }
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const resolve = container.resolve as unknown as (
      key: string
    ) => {
      listAuditEntries: (
        filters: Record<string, unknown>,
        config?: Record<string, unknown>
      ) => Promise<AuditRow[]>
      deleteAuditEntries: (ids: string[]) => Promise<void>
    }
    let service = null as null | {
      listAuditEntries: (
        filters: Record<string, unknown>,
        config?: Record<string, unknown>
      ) => Promise<AuditRow[]>
      deleteAuditEntries: (ids: string[]) => Promise<void>
    }
    for (const key of ["audit_log", "auditLogModuleService"]) {
      try {
        const candidate = resolve(key)
        if (candidate && typeof candidate.listAuditEntries === "function") {
          service = candidate
          break
        }
      } catch {
        // try the next key
      }
    }
    if (!service) {
      return
    }
    // Oldest-first batches; the first fresh row ends the run (everything
    // after it is newer). Batch cap bounds a single run on huge tables.
    const TAKE = 500
    const MAX_BATCHES = 4
    let deleted = 0
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const rows = await service.listAuditEntries(
        {},
        { take: TAKE, order: { created_at: "ASC" } }
      )
      if (!rows.length) {
        break
      }
      const stale = rows.filter(
        (r) => r?.id && r.created_at && new Date(r.created_at).getTime() < cutoff
      )
      if (stale.length) {
        await service.deleteAuditEntries(stale.map((r) => r.id))
        deleted += stale.length
      }
      if (stale.length < rows.length) {
        break
      }
    }
    if (deleted > 0) {
      logger.info(
        `audit-retention: deleted ${deleted} audit row(s) older than ${days}d`
      )
    }
  } catch (e) {
    logger.error(`audit-retention: run failed — ${(e as Error).message}`)
  }
}

export const config = {
  name: "audit-retention",
  schedule: process.env.AUDIT_RETENTION_CRON || "30 3 * * *",
}

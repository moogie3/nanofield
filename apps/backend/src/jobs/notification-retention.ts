import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

// Feed retention: deletes channel "feed" rows older than FEED_RETENTION_DAYS
// (default 90, daily 03:00). The bell + history UIs treat the feed as
// append-only history, but unbounded growth is a liability — old rows have
// zero readers (badge/page only surface recent items) and the notification
// table is write-heavy. Broadcasts, customer rows, and admin notes are all
// covered: age is the only criterion, nothing is special-cased.
// Set FEED_RETENTION_DAYS=0 to disable. A run never throws.
const retentionDays = () => {
  const n = Number(process.env.FEED_RETENTION_DAYS ?? 90)
  if (!Number.isFinite(n) || n < 0) {
    return 90
  }
  return Math.floor(n)
}

type FeedRow = { id: string; created_at?: string }

export default async function notificationRetentionJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const days = retentionDays()
    if (days === 0) {
      return
    }
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const notificationModule = container.resolve(
      Modules.NOTIFICATION
    ) as unknown as {
      listNotifications: (
        filters: Record<string, unknown>,
        config?: Record<string, unknown>
      ) => Promise<FeedRow[]>
      deleteNotifications: (ids: string[]) => Promise<void>
    }
    // Oldest-first batches; the first fresh row ends the run (everything
    // after it is newer). Batch cap bounds a single run on huge tables.
    const TAKE = 500
    const MAX_BATCHES = 4
    let deleted = 0
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const rows = await notificationModule.listNotifications(
        { channel: "feed" },
        { take: TAKE, order: { created_at: "ASC" } }
      )
      if (!rows.length) {
        break
      }
      const stale = rows.filter(
        (r) => r?.id && r.created_at && new Date(r.created_at).getTime() < cutoff
      )
      if (stale.length) {
        await notificationModule.deleteNotifications(stale.map((r) => r.id))
        deleted += stale.length
      }
      if (stale.length < rows.length) {
        break
      }
    }
    if (deleted > 0) {
      logger.info(
        `notification-retention: deleted ${deleted} feed row(s) older than ${days}d`
      )
    }
  } catch (e) {
    logger.error(`notification-retention: run failed — ${(e as Error).message}`)
  }
}

export const config = {
  name: "notification-retention",
  schedule: process.env.FEED_RETENTION_CRON || "0 3 * * *",
}

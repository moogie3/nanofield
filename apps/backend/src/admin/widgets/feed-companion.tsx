import { useEffect, useRef } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { toast } from "@medusajs/ui"
import { sdk } from "../lib/sdk"

type FeedRow = {
  id: string
  created_at?: string
  data?: { title?: string; description?: string }
}

const SEEN_KEY = "nf-feed-seen-at"
const POLL_MS = 60000
const MAX_TOASTS = 3

// Invisible companion to the navbar bell (topbar mounts on every dashboard
// page). Polls the feed channel and toasts arrivals newer than the last
// seen timestamp — including ones that landed while the operator was away.
// Server history is never touched: dismissing happens in the drawer itself
// (brand-dom sweep), this only announces.
const FeedCompanion = () => {
  const baseline = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null

    const poll = async (silent: boolean) => {
      try {
        const { notifications } = (await sdk.admin.notification.list({
          channel: "feed",
          limit: 20,
        })) as { notifications?: FeedRow[] }
        if (!alive) {
          return
        }
        const rows = ((notifications ?? []).filter((n) => n?.id) as FeedRow[])
          .filter((n) => n.created_at)
          .sort((a, b) => (a.created_at! < b.created_at! ? 1 : -1))
        if (!rows.length) {
          return
        }
        if (baseline.current === null) {
          try {
            baseline.current =
              window.localStorage.getItem(SEEN_KEY) ?? rows[0].created_at ?? null
          } catch {
            baseline.current = rows[0].created_at ?? null
          }
          if (silent) {
            return
          }
        }
        const fresh = rows
          .filter(
            (n) =>
              n.created_at &&
              baseline.current &&
              n.created_at > baseline.current
          )
          .reverse()
        for (const n of fresh.slice(0, MAX_TOASTS)) {
          toast.info(n.data?.title || "New notification", {
            description: n.data?.description,
          })
        }
        const newest = rows[0].created_at
        if (newest && (!baseline.current || newest > baseline.current)) {
          baseline.current = newest
          try {
            window.localStorage.setItem(SEEN_KEY, newest)
          } catch {
            // private mode — toasts still work for this session
          }
        }
      } catch {
        // feed unreachable (logged-out shell, backend hiccup) — next poll
      }
    }

    // Seed silently shortly after mount, then announce on the interval.
    const boot = setTimeout(() => void poll(true), 5000)
    timer = setInterval(() => void poll(false), POLL_MS)
    return () => {
      alive = false
      clearTimeout(boot)
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [])

  return null
}

export const config = defineWidgetConfig({
  id: "nanofield:feed-companion",
  zone: "topbar",
})

export default FeedCompanion

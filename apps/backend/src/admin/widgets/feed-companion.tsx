import { useEffect, useRef } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { toast } from "@medusajs/ui"
import { sdk } from "../lib/sdk"

type FeedRow = {
  id: string
  created_at?: string
  data?: { title?: string; description?: string; link?: string }
}

const SEEN_KEY = "nf-feed-seen-at"
const POLL_MS = 10000
const MAX_TOASTS = 3
const BADGE_ID = "nf-live-chat-badge"

// The Live Chat sidebar item is React-managed DOM we don't own, so the
// badge is injected/removed by id on every poll. Count is the summed
// admin_unread across conversations; zero removes the badge entirely.
const applySidebarBadge = (count: number) => {
  const existing = document.getElementById(BADGE_ID)
  if (count <= 0) {
    existing?.remove()
    return
  }
  const link = document.querySelector<HTMLAnchorElement>(
    'a[href="/app/live-chat"]'
  )
  if (!link) {
    existing?.remove()
    return
  }
  let badge = existing
  if (!badge || !link.contains(badge)) {
    existing?.remove()
    badge = document.createElement("span")
    badge.id = BADGE_ID
    badge.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;" +
      "min-width:18px;height:18px;padding:0 5px;margin-left:auto;" +
      "border-radius:9px;background-color:var(--ui-bg-error,#e11d48);" +
      "color:var(--ui-fg-on-color,#fff);font-size:11px;font-weight:600;" +
      "line-height:1;"
    link.appendChild(badge)
  }
  const text = count > 99 ? "99+" : String(count)
  if (badge.textContent !== text) {
    badge.textContent = text
  }
  badge.setAttribute("aria-label", `${count} unread chat messages`)
}

// Invisible companion to the navbar bell (topbar mounts on every dashboard
// page). Three jobs, one 10s cycle:
// 1. Poll the feed channel and toast arrivals newer than the last seen
//    timestamp — including ones that landed while the operator was away.
//    Server history is never touched: dismissing happens in the drawer
//    itself (brand-dom sweep), this only announces.
// 2. Presence heartbeat — PATCHes /admin/chat/presence so the storefront
//    reports "Online" while the admin is anywhere in the dashboard, not
//    only while the live-chat page itself is focused.
// 3. Sidebar unread badge — total unread visitor messages on the Live
//    Chat nav item.
const FeedCompanion = () => {
  const baseline = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null

    const beat = () => {
      if (document.visibilityState === "visible") {
        void fetch("/admin/chat/presence", { method: "PATCH" }).catch(
          () => {}
        )
      }
    }

    const refreshBadge = async () => {
      try {
        const res = await fetch("/admin/chat/unread-count")
        if (!res.ok) {
          return
        }
        const data = (await res.json()) as { count?: number }
        if (alive && typeof data.count === "number") {
          applySidebarBadge(data.count)
        }
      } catch {
        // endpoint unreachable — badge stays as-is until the next cycle
      }
    }

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
          const link = n.data?.link
          // Feed rows may carry a deep link (e.g. live chat lands on
          // /app/live-chat?conversation=<id>) — the toast becomes the
          // path into the page that can act on the event.
          const options: Parameters<typeof toast.info>[1] = {
            description: n.data?.description,
          }
          if (link) {
            options.action = {
              label: "Open",
              altText: "Open the related admin page",
              onClick: () => {
                window.location.assign(link)
              },
            }
          }
          toast.info(n.data?.title || "New notification", options)
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

    const cycle = () => {
      beat()
      void refreshBadge()
      void poll(false)
    }

    // Seed silently shortly after mount, then announce on the interval.
    beat()
    void refreshBadge()
    const boot = setTimeout(() => void poll(true), 5000)
    timer = setInterval(cycle, POLL_MS)

    // Release presence when this widget goes away — logout remounts the
    // shell to the login page, and pagehide covers tab close. Without
    // this the last heartbeat ages out over the presence window (up to
    // 3 minutes of stale "Online" on the storefront). keepalive lets the
    // DELETE survive page teardown.
    const release = () => {
      void fetch("/admin/chat/presence", {
        method: "DELETE",
        keepalive: true,
      }).catch(() => {})
    }
    window.addEventListener("pagehide", release)

    return () => {
      alive = false
      clearTimeout(boot)
      if (timer) {
        clearInterval(timer)
      }
      window.removeEventListener("pagehide", release)
      release()
    }
  }, [])

  return null
}

export const config = defineWidgetConfig({
  id: "nanofield:feed-companion",
  zone: "topbar",
})

export default FeedCompanion

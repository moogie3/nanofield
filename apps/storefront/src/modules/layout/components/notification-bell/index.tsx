"use client"

import { Popover, PopoverButton, PopoverPanel, Transition } from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import {
  listCustomerNotifications,
  type CustomerNotification,
} from "@lib/data/notifications"
import {
  dismissNotificationId,
  getDismissedIds,
} from "@lib/util/feed-dismiss"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react"
import { BellNavIcon } from "../nav-icons"

const POLL_MS = 60000
const PANEL_LIMIT = 8

const seenKey = (customerId: string) => `nf-cust-feed-seen-${customerId}`

// Short relative stamp ("5m", "3h", "2d"); falls back to the date when the
// timestamp is missing or unparseable. Bell-only helper — nowhere else
// needs relative time.
const timeAgo = (iso?: string): string => {
  if (!iso) {
    return ""
  }
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) {
    return ""
  }
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (mins < 1) {
    return "now"
  }
  if (mins < 60) {
    return `${mins}m`
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return `${hours}h`
  }
  return `${Math.floor(hours / 24)}d`
}

// Logged-in customer bell. Server wrapper (notification-button) gates on
// login and seeds `initial`; this component polls the feed every 60s and
// tracks unread as items newer than the localStorage seen timestamp — the
// same tradeoff as the admin bell (per-device read state, no schema).
export default function NotificationBell({
  customerId,
  initial,
}: {
  customerId: string
  initial: CustomerNotification[]
}) {
  const [items, setItems] = useState<CustomerNotification[]>(initial)
  // Per-row dismissal (the header X only closes the panel). Dismissed ids
  // persist per device; the server feed stays append-only history.
  const [dismissed, setDismissed] = useState<string[]>(() =>
    getDismissedIds()
  )
  const [seenAt, setSeenAt] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(seenKey(customerId))
    } catch {
      return null
    }
  })

  // Failed polls keep the stale list: only fresh rows replace. This is
  // what used to blank the panel seconds after opening (one failed fetch
  // → setItems([]) → "all gone").
  const refresh = useCallback(async () => {
    const feed = await listCustomerNotifications(20, 0)
    if (feed.ok) {
      setItems(feed.notifications)
    }
  }, [])

  // First mount: silent baseline (newest item) so history doesn't all
  // light up as unread; then poll while the tab is visible.
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(seenKey(customerId))) {
        const newest = initial[0]?.created_at ?? new Date().toISOString()
        window.localStorage.setItem(seenKey(customerId), newest)
        setSeenAt(newest)
      }
    } catch {
      // private mode — badge still works for this session
    }
    const timer = setInterval(() => {
      if (!document.hidden) {
        refresh()
      }
    }, POLL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  const markRead = useCallback(() => {
    const newest =
      items[0]?.created_at && (!seenAt || items[0].created_at > seenAt)
        ? items[0].created_at
        : (seenAt ?? new Date().toISOString())
    setSeenAt(newest)
    try {
      window.localStorage.setItem(seenKey(customerId), newest)
    } catch {
      // badge still updates for this session
    }
    refresh()
  }, [items, seenAt, customerId, refresh])

  const unread = seenAt
    ? items.filter(
        (n) =>
          !dismissed.includes(n.id) && n.created_at && n.created_at > seenAt
      ).length
    : 0
  const visible = items.filter((n) => !dismissed.includes(n.id))
  const shown = visible.slice(0, PANEL_LIMIT)

  const onDismissRow = (e: ReactMouseEvent, id: string) => {
    // Rows are links — dismiss must not navigate.
    e.preventDefault()
    e.stopPropagation()
    setDismissed(dismissNotificationId(id))
  }

  return (
    <Popover className="relative flex h-full items-center">
      {/* Full-height centering chain (matches the account/cart links) plus
          no stuck focus ring: after clicking, focus stays on the button and
          the default ring would sit visible around the bell. */}
      {({ open, close }) => (
        <>
          <PopoverButton
            aria-label={
              unread > 0
                ? `Notifications (${unread} unread)`
                : "Notifications"
            }
            data-testid="nav-notification-button"
            onClick={() => {
              if (!open) {
                markRead()
              }
            }}
            className="hover:text-ui-fg-base flex items-center rounded-md p-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 hover:bg-muted active:scale-95 focus:outline-none"
          >
            <BellNavIcon count={unread} />
          </PopoverButton>
          <Transition
            show={open}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <PopoverPanel
              static
              className="hidden small:block absolute top-[calc(100%+1px)] right-0 bg-popover border-x border-b border-border w-[380px] text-popover-foreground"
              data-testid="nav-notification-panel"
            >
              {/* No header close button by decision: clicking the bell icon
                  toggles the panel, per-row X dismisses single items. */}
              <div className="p-3 flex items-center justify-center">
                <h3 className="text-large-semi">Notifications</h3>
              </div>
              {!shown.length ? (
                <p className="px-4 pb-5 text-center text-small-regular text-ui-fg-subtle">
                  You are all caught up.
                </p>
              ) : (
                <ul className="overflow-y-scroll max-h-[402px] px-3 no-scrollbar p-px flex flex-col">
                  {shown.map((n) => {
                    const isUnread =
                      !!seenAt &&
                      !!n.created_at &&
                      n.created_at > seenAt
                    const row = (
                      <>
                        {n.broadcast && (
                          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-primary">
                            Announcement
                          </span>
                        )}
                        <span className="flex items-start justify-between gap-2">
                          <span
                            className={
                              isUnread
                                ? "text-small-semi text-ui-fg-base"
                                : "text-small-regular text-ui-fg-base"
                            }
                          >
                            {n.title}
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                            <span className="text-small-regular text-ui-fg-subtle">
                              {timeAgo(n.created_at)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => onDismissRow(e, n.id)}
                              aria-label={`Dismiss: ${n.title}`}
                              className="rounded p-0.5 text-ui-fg-subtle hover:bg-muted hover:text-ui-fg-base focus:outline-none"
                            >
                              <XMark className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </span>
                        {!!n.description && (
                          <span className="mt-0.5 block text-small-regular text-ui-fg-subtle">
                            {n.description}
                          </span>
                        )}
                      </>
                    )
                    return (
                      <li key={n.id} className="border-t border-border py-2.5">
                        {n.orderId ? (
                          <LocalizedClientLink
                            href={`/account/orders/details/${n.orderId}`}
                            onClick={close}
                            className="block rounded-md px-2 py-1 hover:bg-muted"
                          >
                            {row}
                          </LocalizedClientLink>
                        ) : n.link ? (
                          <LocalizedClientLink
                            href={n.link}
                            onClick={close}
                            className="block rounded-md px-2 py-1 hover:bg-muted"
                          >
                            {row}
                          </LocalizedClientLink>
                        ) : (
                          <div className="px-2 py-1">{row}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              {visible.length > 0 && (
                <div className="border-t border-border p-3 flex items-center justify-center gap-3">
                  {visible.length > PANEL_LIMIT && (
                    <span className="text-small-regular text-ui-fg-subtle">
                      +{visible.length - PANEL_LIMIT} more
                    </span>
                  )}
                  <LocalizedClientLink
                    href="/account/notifications"
                    onClick={close}
                    className="text-small-semi text-primary hover:underline"
                  >
                    View all
                  </LocalizedClientLink>
                </div>
              )}
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

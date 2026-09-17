"use client"

import { useState, type MouseEvent as ReactMouseEvent } from "react"
import { XMark } from "@medusajs/icons"
import type { CustomerNotification } from "@lib/data/notifications"
import {
  dismissNotificationId,
  getDismissedIds,
} from "@lib/util/feed-dismiss"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NotificationReadMarker from "../notification-read-marker"

// Full-width history list for /account/notifications. Rows mirror the bell
// panel (title + description + date, order rows deep-link); per-row X
// dismisses share the bell's persisted id set. The bell stays the
// unread/badge owner — this page only lists and marks read.
export default function NotificationHistory({
  customerId,
  notifications,
  hasMore,
  nextLimit,
}: {
  customerId: string
  notifications: CustomerNotification[]
  hasMore?: boolean
  nextLimit?: number
}) {
  const [dismissed, setDismissed] = useState<string[]>(() =>
    getDismissedIds()
  )
  const visible = notifications.filter((n) => !dismissed.includes(n.id))

  const onDismissRow = (e: ReactMouseEvent, id: string) => {
    // Order rows are links — dismiss must not navigate.
    e.preventDefault()
    e.stopPropagation()
    setDismissed(dismissNotificationId(id))
  }

  return (
    <div>
      <NotificationReadMarker
        customerId={customerId}
        newest={notifications[0]?.created_at}
      />
      {!visible.length ? (
        <p className="text-small-regular text-ui-fg-subtle">
          No notifications yet. Order updates and store announcements will
          appear here.
        </p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((n) => (
            <li
              key={n.id}
              className="border-t border-border py-4 last:border-b"
              data-testid="notification-row"
            >
              {n.orderId ? (
                <LocalizedClientLink
                  href={`/account/orders/details/${n.orderId}`}
                  className="block rounded-md px-2 py-1 hover:bg-muted"
                >
                  <NotificationRow notification={n} onDismiss={onDismissRow} />
                </LocalizedClientLink>
              ) : n.link ? (
                <LocalizedClientLink
                  href={n.link}
                  className="block rounded-md px-2 py-1 hover:bg-muted"
                >
                  <NotificationRow notification={n} onDismiss={onDismissRow} />
                </LocalizedClientLink>
              ) : (
                <div className="px-2 py-1">
                  <NotificationRow notification={n} onDismiss={onDismissRow} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {hasMore && nextLimit && (
        <div className="mt-6 flex justify-center">
          <LocalizedClientLink
            href={`/account/notifications?limit=${nextLimit}`}
            className="text-small-semi text-primary hover:underline"
          >
            Show more notifications
          </LocalizedClientLink>
        </div>
      )}
    </div>
  )
}

const NotificationRow = ({
  notification: n,
  onDismiss,
}: {
  notification: CustomerNotification
  onDismiss: (e: ReactMouseEvent, id: string) => void
}) => (
  <>
    {n.broadcast && (
      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-primary">
        Announcement
      </span>
    )}
    <span className="flex items-start justify-between gap-2">
      <span className="text-base-regular text-ui-fg-base">{n.title}</span>
      <span className="flex items-center gap-1.5 shrink-0 pt-0.5">
        <span className="text-small-regular text-ui-fg-subtle">
          {formatDate(n.created_at)}
        </span>
        <button
          type="button"
          onClick={(e) => onDismiss(e, n.id)}
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

// Absolute date on the history page (the bell panel uses relative stamps) —
// history is scanned, not glanced.
const formatDate = (iso?: string): string => {
  if (!iso) {
    return ""
  }
  const t = new Date(iso)
  if (!Number.isFinite(t.getTime())) {
    return ""
  }
  return t.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

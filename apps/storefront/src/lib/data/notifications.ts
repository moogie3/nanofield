"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type CustomerNotification = {
  id: string
  title: string
  description: string
  created_at?: string
  orderId?: string
  link?: string
  broadcast?: boolean
}

// Customer bell feed (GET /store/notifications). Never throws — but the
// ok flag tells the bell whether the rows are fresh: a failed poll returns
// ok:false and the bell keeps its stale list instead of blanking. No cache
// options on purpose: the bell polls for freshness.
export type NotificationFeed = {
  notifications: CustomerNotification[]
  total: number
  ok: boolean
}

export const listCustomerNotifications = async (
  limit = 20,
  offset = 0
): Promise<NotificationFeed> => {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders) {
    return { notifications: [], total: 0, ok: false }
  }

  return await sdk.client
    .fetch<{ notifications?: CustomerNotification[]; total?: number }>(
      `/store/notifications`,
      {
        method: "GET",
        query: { limit, offset },
        headers: {
          ...authHeaders,
        },
      }
    )
    .then(({ notifications, total }) => ({
      notifications: notifications ?? [],
      total: total ?? 0,
      ok: true,
    }))
    .catch(() => ({ notifications: [], total: 0, ok: false }))
}

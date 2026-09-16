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

// Customer bell feed (GET /store/notifications). Never throws: the bell
// must not break the navbar when the backend hiccups — callers render
// whatever arrives, down to nothing. No cache options on purpose: the
// bell polls for freshness.
export const listCustomerNotifications = async (
  limit = 20,
  offset = 0
): Promise<CustomerNotification[]> => {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders) {
    return []
  }

  return await sdk.client
    .fetch<{ notifications?: CustomerNotification[] }>(
      `/store/notifications`,
      {
        method: "GET",
        query: { limit, offset },
        headers: {
          ...authHeaders,
        },
      }
    )
    .then(({ notifications }) => notifications ?? [])
    .catch(() => [])
}

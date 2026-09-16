"use client"

import { useEffect } from "react"

// Marks the feed read when the history page is visited — the navbar bell
// badge clears without needing the dropdown opened. Same per-customer
// seen key the bell uses.
export default function NotificationReadMarker({
  customerId,
  newest,
}: {
  customerId: string
  newest?: string
}) {
  useEffect(() => {
    try {
      window.localStorage.setItem(
        `nf-cust-feed-seen-${customerId}`,
        newest ?? new Date().toISOString()
      )
    } catch {
      // private mode — badge keeps its session state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  return null
}

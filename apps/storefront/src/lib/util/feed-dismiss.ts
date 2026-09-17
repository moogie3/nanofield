// Per-notification dismissal for the customer bell + history page.
// Client-side only (localStorage id set) — the server feed is append-only
// history, dismissal is a per-device view preference like the seen key.
// Lives outside lib/data (those modules are "use server" and cannot be
// imported by client components).
const KEY = "nf-cust-feed-dismissed"

const readIds = (): string[] => {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : []
  } catch {
    return []
  }
}

export const getDismissedIds = (): string[] => {
  try {
    return readIds()
  } catch {
    return []
  }
}

export const dismissNotificationId = (id: string): string[] => {
  const next = Array.from(new Set([...readIds(), id]))
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // private mode — dismissal lasts this session via state
  }
  return next
}

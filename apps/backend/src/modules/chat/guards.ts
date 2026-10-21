import { randomBytes } from "crypto"

// Pure validation + rate-limit helpers for the live-chat module. No Medusa
// imports here so the unit suite can exercise everything directly.

export const CHAT_MAX_BODY = 2000
export const CHAT_MAX_NAME = 80
export const CHAT_MAX_EMAIL = 200
export const CHAT_RATE_WINDOW_MS = 10_000
export const CHAT_RATE_MAX = 6
export const CHAT_MAX_IMAGE_REF = 300

export type GuardResult =
  | { ok: true; value: string }
  | { ok: false; error: string }

export const normalizeBody = (
  raw: unknown,
  opts: { allowEmpty?: boolean } = {}
): GuardResult => {
  if (raw === undefined || raw === null) {
    return opts.allowEmpty
      ? { ok: true, value: "" }
      : { ok: false, error: "body is required" }
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "body must be a string" }
  }
  const value = raw.trim()
  if (!value) {
    return opts.allowEmpty
      ? { ok: true, value: "" }
      : { ok: false, error: "body is required" }
  }
  if (value.length > CHAT_MAX_BODY) {
    return {
      ok: false,
      error: `body must be at most ${CHAT_MAX_BODY} characters`,
    }
  }
  return { ok: true, value }
}

// Image attachment reference on a message: must be a path the upload route
// minted (/static/chat/...), never an arbitrary URL — a visitor could
// otherwise plant tracking pixels or forge admin-hosted links. Empty is
// allowed (text-only message).
export const normalizeImageRef = (raw: unknown): GuardResult => {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: "" }
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "image_url must be a string" }
  }
  if (
    raw.length > CHAT_MAX_IMAGE_REF ||
    !raw.startsWith("/static/chat/") ||
    raw.includes("..")
  ) {
    return {
      ok: false,
      error: "image_url must be a chat upload path (/static/chat/...)",
    }
  }
  return { ok: true, value: raw }
}

// Guests may leave a name/email so the operator knows who is writing; both
// are optional and clamped. Email only gets shape-level validation — the
// chat has no verification step (unlike customer accounts).
export const normalizeProfile = (
  name: unknown,
  email: unknown
): { name: string | null; email: string | null } => {
  const cleanName =
    typeof name === "string" && name.trim()
      ? name.trim().slice(0, CHAT_MAX_NAME)
      : null
  let cleanEmail: string | null = null
  if (typeof email === "string" && email.trim()) {
    const trimmed = email.trim().slice(0, CHAT_MAX_EMAIL)
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      cleanEmail = trimmed
    }
  }
  return { name: cleanName, email: cleanEmail }
}

// Sliding-window rate limit: a visitor may send at most CHAT_RATE_MAX
// messages per CHAT_RATE_WINDOW_MS. Pure against an injected timestamp list
// so tests never sleep; the service owns the per-conversation state.
export const rateLimitOk = (
  history: number[],
  now: number,
  windowMs: number = CHAT_RATE_WINDOW_MS,
  max: number = CHAT_RATE_MAX
): boolean => {
  const recent = history.filter((t) => now - t < windowMs)
  return recent.length < max
}

export const pruneRateHistory = (
  history: number[],
  now: number,
  windowMs: number = CHAT_RATE_WINDOW_MS
): number[] => history.filter((t) => now - t < windowMs)

// Capability token handed to the widget and stored in localStorage. 24
// random bytes hex — possession of the token is the guest's authz (sessions
// don't cross the storefront/backend boundary cleanly for EventSource, and
// guests have no account at all). Never derived from user input.
export const generateVisitorToken = (): string => randomBytes(24).toString("hex")

export const isVisitorToken = (raw: unknown): raw is string =>
  typeof raw === "string" && /^[a-f0-9]{48}$/.test(raw)

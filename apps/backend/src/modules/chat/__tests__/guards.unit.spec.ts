import {
  CHAT_MAX_BODY,
  CHAT_RATE_MAX,
  CHAT_RATE_WINDOW_MS,
  generateVisitorToken,
  isVisitorToken,
  normalizeBody,
  normalizeImageRef,
  normalizeProfile,
  pruneRateHistory,
  rateLimitOk,
} from "../guards"

describe("normalizeBody", () => {
  it("trims and returns a valid body", () => {
    const result = normalizeBody("  hello there  ")
    expect(result).toEqual({ ok: true, value: "hello there" })
  })

  it("rejects empty, whitespace-only and non-string bodies", () => {
    expect(normalizeBody("").ok).toBe(false)
    expect(normalizeBody("   ").ok).toBe(false)
    expect(normalizeBody(null).ok).toBe(false)
    expect(normalizeBody(42).ok).toBe(false)
  })

  it("allows an empty body when an image is attached", () => {
    expect(normalizeBody("", { allowEmpty: true })).toEqual({
      ok: true,
      value: "",
    })
    expect(normalizeBody(undefined, { allowEmpty: true }).ok).toBe(true)
    expect(normalizeBody("  ", { allowEmpty: true })).toEqual({
      ok: true,
      value: "",
    })
    expect(normalizeBody(42, { allowEmpty: true }).ok).toBe(false)
  })

  it("rejects bodies over the max length", () => {
    const over = "x".repeat(CHAT_MAX_BODY + 1)
    const result = normalizeBody(over)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/at most/)
    }
  })

  it("accepts a body of exactly the max length", () => {
    const exact = "x".repeat(CHAT_MAX_BODY)
    expect(normalizeBody(exact).ok).toBe(true)
  })
})

describe("normalizeImageRef", () => {
  it("accepts empty refs (text-only message)", () => {
    expect(normalizeImageRef(undefined)).toEqual({ ok: true, value: "" })
    expect(normalizeImageRef(null)).toEqual({ ok: true, value: "" })
    expect(normalizeImageRef("")).toEqual({ ok: true, value: "" })
  })

  it("accepts a chat upload path", () => {
    const path = "/static/chat/1761000000000-docs.png"
    expect(normalizeImageRef(path)).toEqual({ ok: true, value: path })
  })

  it("rejects non-chat or absolute URLs", () => {
    expect(normalizeImageRef("https://evil.example/pixel.png").ok).toBe(false)
    expect(normalizeImageRef("/static/banners/x.png").ok).toBe(false)
    expect(normalizeImageRef("/static/chat/../../etc").ok).toBe(false)
    expect(normalizeImageRef(42).ok).toBe(false)
  })

  it("rejects refs over the max length", () => {
    const long = `/static/chat/${"a".repeat(400)}.png`
    expect(normalizeImageRef(long).ok).toBe(false)
  })
})

describe("normalizeProfile", () => {
  it("trims and clamps the name, validates email shape", () => {
    const profile = normalizeProfile(
      `  ${"n".repeat(200)}  `,
      "  buyer@example.com  "
    )
    expect(profile.name).toHaveLength(80)
    expect(profile.email).toBe("buyer@example.com")
  })

  it("returns nulls for missing or invalid values", () => {
    expect(normalizeProfile(undefined, undefined)).toEqual({
      name: null,
      email: null,
    })
    expect(normalizeProfile("  ", "not-an-email")).toEqual({
      name: null,
      email: null,
    })
  })
})

describe("rateLimitOk / pruneRateHistory", () => {
  const now = 1_000_000

  it("allows sends under the cap and blocks at the cap", () => {
    const history = Array.from({ length: CHAT_RATE_MAX - 1 }, (_, i) => now - i)
    expect(rateLimitOk(history, now)).toBe(true)
    const full = Array.from({ length: CHAT_RATE_MAX }, (_, i) => now - i)
    expect(rateLimitOk(full, now)).toBe(false)
  })

  it("frees a slot once entries age out of the window", () => {
    const full = Array.from({ length: CHAT_RATE_MAX }, (_, i) => now - i)
    expect(rateLimitOk(full, now + CHAT_RATE_WINDOW_MS + 1)).toBe(true)
  })

  it("pruneRateHistory drops entries older than the window", () => {
    const stale = now - CHAT_RATE_WINDOW_MS - 1
    const fresh = now - 100
    expect(pruneRateHistory([stale, fresh], now)).toEqual([fresh])
  })
})

describe("generateVisitorToken / isVisitorToken", () => {
  it("mints unique 48-char hex tokens", () => {
    const a = generateVisitorToken()
    const b = generateVisitorToken()
    expect(a).toMatch(/^[a-f0-9]{48}$/)
    expect(a).not.toBe(b)
    expect(isVisitorToken(a)).toBe(true)
  })

  it("rejects non-token values", () => {
    expect(isVisitorToken("")).toBe(false)
    expect(isVisitorToken("nothex")).toBe(false)
    expect(isVisitorToken("ABCDEF")).toBe(false)
    expect(isVisitorToken(null)).toBe(false)
  })
})

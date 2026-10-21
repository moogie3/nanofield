"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import {
  fetchChatMessages,
  getChatStatus,
  sendChatMessage,
  startChat,
  type ChatConversationView,
  type ChatMessage,
} from "@lib/data/chat"
import { Button, Heading, Text } from "@modules/common/components/ui"

// Floating live-chat widget. A bubble opens a panel; the panel streams
// admin replies over SSE (direct fetch to the backend, NOT EventSource,
// because /store/* needs the publishable-key header) and sends messages
// through the server actions in @lib/data/chat (so a logged-in customer's
// session attaches automatically).
// The capability token lives in localStorage and resumes the conversation
// across visits; customers additionally resume by account even if the
// token is gone. When nobody is at the desk (/store/chat/status says
// offline) the panel leads with the WhatsApp fallback.
// While the panel is minimized the stream is down by design; a 10s tail
// poll keeps a red dot on the bubble so an admin reply is never invisible.

const TOKEN_KEY = "nf-chat-token"
const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const readToken = (): string | null => {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

const writeToken = (token: string | null) => {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token)
    } else {
      window.localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // private mode / storage full — resume still works by customer session
  }
}

const timeLabel = (iso: string | null): string => {
  if (!iso) {
    return ""
  }
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

// SSE frames arrive as "\n\n"-separated blocks: comments (: ready/ping),
// retry hints, and "event: message\ndata: {...}". Parse leniently: unknown
// frames are ignored, data lines are joined per the SSE spec.
const parseFrames = (
  buffer: string
): { frames: string[]; rest: string } => {
  const frames: string[] = []
  let rest = buffer
  let idx = rest.indexOf("\n\n")
  while (idx >= 0) {
    frames.push(rest.slice(0, idx))
    rest = rest.slice(idx + 2)
    idx = rest.indexOf("\n\n")
  }
  return { frames, rest }
}

const frameToMessage = (frame: string): ChatMessage | null => {
  const lines = frame.split("\n")
  const isMessage = lines.some((l) => l.startsWith("event: message"))
  if (!isMessage) {
    return null
  }
  const data = lines
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim())
    .join("\n")
  if (!data) {
    return null
  }
  try {
    const parsed = JSON.parse(data) as ChatMessage
    return parsed?.id ? parsed : null
  } catch {
    return null
  }
}

type PanelState = "idle" | "connecting" | "ready" | "error"

const ChatWidget = ({ whatsappHref }: { whatsappHref?: string }) => {
  const t = useTranslations("chat")
  const [open, setOpen] = useState(false)
  const [online, setOnline] = useState<boolean | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [conversation, setConversation] =
    useState<ChatConversationView | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [state, setState] = useState<PanelState>("idle")
  const [sendError, setSendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [pendingImage, setPendingImage] = useState<{
    url: string
    name: string
  } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [unread, setUnread] = useState(0)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const startAttemptedRef = useRef(false)
  const lastIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const streamTokenRef = useRef<string | null>(null)
  const openRef = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const bubbleRef = useRef<HTMLButtonElement | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)

  openRef.current = open

  const appendMessages = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) {
      return
    }
    // Dedup OUTSIDE setState: StrictMode double-invokes the updater, and a
    // seenIdsRef mutation inside would make the second invocation treat the
    // batch as already-seen and drop it (the message never renders and its
    // id stays poisoned, so reconcile/backfill can't recover it either).
    const fresh = incoming.filter((m) => !seenIdsRef.current.has(m.id))
    if (!fresh.length) {
      return
    }
    for (const m of fresh) {
      seenIdsRef.current.add(m.id)
    }
    setMessages((prev) => {
      const next = [...prev, ...fresh]
      next.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
      return next
    })
  }, [])

  // Backfill cursor follows the newest message (messages is kept sorted by
  // created_at). Derived here instead of inside the append updater — refs
  // must not be mutated in a state updater (StrictMode double-invokes it).
  useEffect(() => {
    if (messages.length) {
      lastIdRef.current = messages[messages.length - 1].id
    }
  }, [messages])

  // Presence probe: on every open and every 30s while open, so an admin
  // logout flips the header to "Away" (and surfaces the WhatsApp CTA)
  // without the visitor having to reopen the panel.
  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    const probe = () => {
      void getChatStatus()
        .then((s) => {
          if (!cancelled) {
            setOnline(s.online)
          }
        })
        .catch(() => {})
    }
    probe()
    const timer = setInterval(probe, 30_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [open])

  // Start or resume the conversation the first time the panel opens. The
  // started-ref (not a cancelled flag) guards the effect: setState inside
  // the effect re-runs it, which would fire a cancelled cleanup before the
  // promise resolves and strand the panel on "connecting" forever.
  useEffect(() => {
    if (!open || state !== "idle" || startAttemptedRef.current) {
      return
    }
    startAttemptedRef.current = true
    setState("connecting")
    void startChat({ token: readToken() })
      .then((snapshot) => {
        if (!snapshot.ok || !snapshot.token) {
          setState("error")
          return
        }
        writeToken(snapshot.token)
        seenIdsRef.current = new Set(snapshot.messages.map((m) => m.id))
        setToken(snapshot.token)
        setConversation(snapshot.conversation)
        setMessages(snapshot.messages)
        setState("ready")
      })
      .catch(() => {
        // The action itself failed (network, backend restart) — without
        // this catch the panel would sit on "connecting" forever.
        setState("error")
      })
  }, [open, state])

  // Backfill anything the stream missed (e.g. between reconnects). The
  // backend answers with everything after the cursor, so an empty result
  // is the common case.
  const backfill = useCallback(
    async (currentToken: string) => {
      const res = await fetchChatMessages({
        token: currentToken,
        cursor: lastIdRef.current,
      })
      if (res.ok) {
        appendMessages(res.messages)
      }
    },
    [appendMessages]
  )

  // SSE stream: one reader per open panel; reconnects every 5s while open
  // (each reconnect also backfills anything missed between connections).
  useEffect(() => {
    if (!open || !token) {
      abortRef.current?.abort()
      abortRef.current = null
      streamTokenRef.current = null
      return
    }
    if (streamTokenRef.current === token) {
      return
    }
    streamTokenRef.current = token
    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = async () => {
      const controller = new AbortController()
      abortRef.current = controller
      let buffer = ""
      try {
        const res = await fetch(
          `${BACKEND_URL}/store/chat/stream?token=${encodeURIComponent(token)}`,
          {
            headers: {
              "x-publishable-api-key": PUBLISHABLE_KEY,
              Accept: "text/event-stream",
            },
            signal: controller.signal,
            cache: "no-store",
          }
        )
        if (!res.ok || !res.body) {
          throw new Error(`stream failed: ${res.status}`)
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const { frames, rest } = parseFrames(buffer)
          buffer = rest
          for (const frame of frames) {
            const message = frameToMessage(frame)
            if (message) {
              appendMessages([message])
            }
          }
        }
      } catch {
        // fall through to reconnect
      }
      if (!cancelled && openRef.current && streamTokenRef.current === token) {
        void backfill(token)
        reconnectTimer = setTimeout(() => void connect(), 5_000)
      }
    }

    void connect()
    return () => {
      cancelled = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      abortRef.current?.abort()
      // Reset the guard so a StrictMode re-run (dev) reconnects: the
      // cleanup aborts the in-flight stream, and without this the re-run
      // would see streamTokenRef === token and early-return, leaving the
      // session with no live channel for admin replies.
      streamTokenRef.current = null
    }
  }, [open, token, appendMessages, backfill])

  // Opening the panel starts from a clean slate: the dot is a "what
  // arrived while you were away" signal, and reopening is that moment.
  useEffect(() => {
    if (open) {
      setUnread(0)
    }
  }, [open])

  // Reopening pulls the full tail: anything the stream missed while the
  // panel was minimized appears, and the server-side visitor_unread
  // resets (the messages GET clears it when the cursor is omitted).
  useEffect(() => {
    if (!open || !token || state !== "ready") {
      return
    }
    void fetchChatMessages({ token, cursor: null })
      .then((res) => {
        if (res.ok) {
          appendMessages(res.messages)
        }
      })
      .catch(() => {})
  }, [open, token, state, appendMessages])

  // While minimized, poll the tail so an admin reply still lands (red
  // dot on the bubble). The stream is down here on purpose; the cursor
  // is the last rendered message, and the seen-ids set guards the count
  // against StrictMode's double-invoked effect.
  useEffect(() => {
    if (open || !token || state !== "ready") {
      return
    }
    const check = async () => {
      const res = await fetchChatMessages({
        token,
        cursor: lastIdRef.current,
      })
      if (!res.ok || !res.messages.length) {
        return
      }
      const fresh = res.messages.filter((m) => !seenIdsRef.current.has(m.id))
      appendMessages(res.messages)
      if (fresh.length) {
        setUnread((c) => c + fresh.length)
      }
    }
    void check()
    const timer = setInterval(() => void check(), 10_000)
    return () => clearInterval(timer)
  }, [open, token, state, appendMessages])

  // Escape closes the panel and returns focus to the bubble (keyboard path).
  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        bubbleRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  // Keep the newest message in view.
  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
    })
  }, [messages])

  // Move focus into the panel once the thread is usable (keyboard path);
  // Escape already returns it to the bubble.
  useEffect(() => {
    if (open && state === "ready") {
      inputRef.current?.focus()
    }
  }, [open, state])

  // Image upload goes straight from the browser to the backend (same
  // rationale as the SSE stream): the file never passes through the Next
  // server, and the capability token is the authz. The returned relative
  // path rides along on the next sendChatMessage call as image_url.
  const uploadImage = async (file: File) => {
    if (!token || uploading) {
      return
    }
    setUploading(true)
    setSendError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(
        `${BACKEND_URL}/store/chat/conversations/current/attachments`,
        {
          method: "POST",
          headers: {
            "x-publishable-api-key": PUBLISHABLE_KEY,
            "x-chat-token": token,
          },
          body: formData,
          cache: "no-store",
        }
      )
      const data = (await res.json().catch(() => null)) as {
        url?: string
        name?: string
        message?: string
      } | null
      if (!res.ok || !data?.url) {
        throw new Error(data?.message || `upload failed: ${res.status}`)
      }
      setPendingImage({ url: data.url, name: data.name || file.name })
    } catch {
      setSendError(t("uploadError"))
    } finally {
      setUploading(false)
    }
  }

  const send = async () => {
    const body = draft.trim()
    if ((!body && !pendingImage) || !token || sending) {
      return
    }
    setSending(true)
    setSendError(null)
    const currentToken = token
    const result = await sendChatMessage({
      token: currentToken,
      body,
      image_url: pendingImage?.url ?? null,
    })
    setSending(false)
    if (!result.ok || !result.message) {
      setSendError(result.error || t("error"))
      return
    }
    setDraft("")
    setPendingImage(null)
    appendMessages([result.message])
    // Reconcile with the server tail right after a send. The local append
    // above already shows the message; this second pass is idempotent (the
    // seen-ids set dedupes) and guarantees the thread reflects server
    // truth even if the POST response shape ever changes — plus it picks
    // up replies that raced our send.
    void fetchChatMessages({ token: currentToken, cursor: null })
      .then((res) => {
        if (res.ok) {
          appendMessages(res.messages)
        }
      })
      .catch(() => {})
  }

  const startNewChat = () => {
    writeToken(null)
    setToken(null)
    setConversation(null)
    setMessages([])
    setPendingImage(null)
    setUnread(0)
    seenIdsRef.current = new Set()
    startAttemptedRef.current = false
    setState("idle")
  }

  const closed = conversation?.status === "closed"

  return (
    <>
      {/* Bubble: 48px tap target, bottom-right, below nav z-index */}
      <button
        ref={bubbleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="nf-chat-panel"
        aria-label={
          !open && unread > 0
            ? `${t("openLabel")}, ${t("unread", { count: unread })}`
            : open
              ? t("closeLabel")
              : t("openLabel")
        }
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 small:bottom-6 small:right-6"
        data-testid="chat-bubble"
      >
        {!open && unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-destructive"
          />
        )}
        {open ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {open && (
        <div
          id="nf-chat-panel"
          role="dialog"
          aria-labelledby="nf-chat-title"
          className="fixed bottom-20 right-2 z-40 flex h-[min(70vh,32rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg small:bottom-24 small:right-6 small:w-96"
          data-testid="chat-panel"
        >
          <div className="border-b border-border px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Heading level="h3" id="nf-chat-title" className="text-base">
                  {t("title")}
                </Heading>
                {/* Presence: dot + label, never color alone. This flags the
                    operator, not backend health: "away" just means slower
                    replies. */}
                {online !== null && (
                  <span className="flex items-center gap-1">
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        online ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <Text as="span" className="text-xs text-muted-foreground">
                      {online ? t("online") : t("away")}
                    </Text>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {online === false && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t("whatsappCta")}
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("closeLabel")}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div
            ref={threadRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            data-testid="chat-thread"
          >
            {state === "connecting" && (
              <Text className="text-sm text-muted-foreground">
                {t("connecting")}
              </Text>
            )}
            {state === "error" && (
              <div className="space-y-2">
                <Text className="text-sm text-muted-foreground">
                  {t("loadError")}
                </Text>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    startAttemptedRef.current = false
                    setState("idle")
                  }}
                >
                  {t("retry")}
                </Button>
              </div>
            )}
            {state === "ready" && messages.length === 0 && (
              <Text className="text-sm text-muted-foreground">{t("empty")}</Text>
            )}
            {messages.map((m) => {
              const mine = m.sender_type === "visitor"
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {!mine && (
                      <Text
                        as="span"
                        className="block text-xs text-muted-foreground"
                      >
                        {t("agent")}
                      </Text>
                    )}
                    {m.image_url && (
                      <a
                        href={`${BACKEND_URL}${m.image_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-1 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${BACKEND_URL}${m.image_url}`}
                          alt={m.body || t("attachLabel")}
                          className="max-h-48 max-w-full rounded-md object-contain"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {m.body && (
                      <Text className="whitespace-pre-wrap break-words text-sm">
                        {m.body}
                      </Text>
                    )}
                    <Text
                      as="span"
                      className={`mt-0.5 block text-right text-xs ${
                        mine
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {timeLabel(m.created_at)}
                    </Text>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-border p-3">
            {closed ? (
              <div className="space-y-2">
                <Text className="text-sm text-muted-foreground">
                  {t("closedNotice")}
                </Text>
                <div className="flex flex-wrap gap-2">
                  <Button size="small" onClick={startNewChat}>
                    {t("newChat")}
                  </Button>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {t("whatsappCta")}
                  </a>
                </div>
              </div>
            ) : (
              <>
                <label htmlFor="nf-chat-input" className="sr-only">
                  {t("placeholder")}
                </label>
                {pendingImage && (
                  <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${BACKEND_URL}${pendingImage.url}`}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                    <Text className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {pendingImage.name}
                    </Text>
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      aria-label={t("removeImage")}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ""
                      if (file) {
                        void uploadImage(file)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={t("attachLabel")}
                    disabled={uploading || state !== "ready" || sending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="chat-attach"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>
                  <input
                    id="nf-chat-input"
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        void send()
                      }
                    }}
                    placeholder={t("placeholder")}
                    disabled={state !== "ready" || sending}
                    maxLength={2000}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="chat-input"
                  />
                  <Button
                    size="small"
                    onClick={() => void send()}
                    disabled={
                      (!draft.trim() && !pendingImage) ||
                      sending ||
                      state !== "ready"
                    }
                    data-testid="chat-send"
                  >
                    {sending ? t("sending") : t("send")}
                  </Button>
                </div>
                {uploading && (
                  <Text className="mt-1.5 text-sm text-muted-foreground">
                    {t("sending")}
                  </Text>
                )}
                {sendError && (
                  <Text className="mt-1.5 text-sm text-destructive">
                    {sendError}
                  </Text>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default ChatWidget

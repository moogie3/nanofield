import { useCallback, useEffect, useRef, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  Prompt,
  Text,
  toast,
} from "@medusajs/ui"

// Live-chat inbox: left pane = conversations by last activity, right pane =
// the selected thread with a reply box. Polls (list 5s, thread 4s) — no SSE
// here on purpose: the operator keeps the inbox open for minutes/hours and
// polling reuses the same authenticated admin fetch path as the rest of the
// admin. A presence heartbeat every 60s (while the tab is visible) keeps the
// storefront's "online" flag fresh.
// Deep link: /app/live-chat?conversation=<id> (the bell feed links here).
// Select mode adds bulk actions: Mark read + Close on the open/all lists,
// Delete on the closed list.

type Conversation = {
  id: string
  customer_id: string | null
  guest_name: string | null
  guest_email: string | null
  status: string
  admin_unread: number
  last_message_at: string | null
  last_message: {
    body: string
    sender_type: string
    image_url: string | null
    created_at: string | null
  } | null
}

type Message = {
  id: string
  sender_type: string
  sender_label: string | null
  body: string
  image_url: string | null
  created_at: string | null
}

type StatusFilter = "all" | "open" | "closed"

const RouteIcon = () => <ChatBubbleLeftRight />

const displayName = (c: Conversation): string =>
  c.guest_name || c.guest_email || c.customer_id?.slice(0, 12) || "Guest"

const timeLabel = (iso: string | null): string => {
  if (!iso) {
    return ""
  }
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const LiveChatPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [filter, setFilter] = useState<StatusFilter>("open")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [pendingImage, setPendingImage] = useState<{
    url: string
    name: string
  } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const threadRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const loadList = useCallback(async () => {
    try {
      const r = await fetch(`/admin/chat/conversations?status=${filter}`)
      const data = (await r.json()) as {
        conversations?: Conversation[]
        message?: string
      }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      setConversations(data.conversations ?? [])
      setConnected(true)
    } catch (e) {
      setConnected(false)
      setError((e as Error).message)
    } finally {
      setLoadingList(false)
    }
  }, [filter])

  const loadThread = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/admin/chat/conversations/${id}`)
      const data = (await r.json()) as {
        messages?: Message[]
        message?: string
      }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      setMessages(data.messages ?? [])
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  // Deep link from the bell feed: open the conversation in the URL once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const target = params.get("conversation")
    if (target) {
      setSelectedId(target)
    }
  }, [])

  // List polling (5s) starts after the first load.
  useEffect(() => {
    void loadList()
    const timer = setInterval(() => void loadList(), 5_000)
    return () => clearInterval(timer)
  }, [loadList])

  // Thread polling (4s) only while a conversation is selected.
  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    setPendingImage(null)
    void loadThread(selectedId)
    const timer = setInterval(() => void loadThread(selectedId), 4_000)
    return () => clearInterval(timer)
  }, [selectedId, loadThread])

  // Presence heartbeat (60s while visible; immediate on mount). This is
  // what makes /store/chat/status report online on the storefront.
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") {
        void fetch("/admin/chat/presence", { method: "PATCH" }).catch(() => {})
      }
    }
    beat()
    const timer = setInterval(beat, 60_000)
    document.addEventListener("visibilitychange", beat)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", beat)
      // Release presence on unmount (logout, navigation away) so the
      // storefront flips to Away immediately instead of riding out the
      // heartbeat window. The global feed-companion re-beats within 10s
      // if the operator is still in the dashboard.
      void fetch("/admin/chat/presence", { method: "DELETE" }).catch(() => {})
    }
  }, [])

  // Keep the newest message in view when the thread changes.
  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  // Same-origin upload: FormData straight to the backend (session cookies
  // ride along). The relative path returned goes into the reply as
  // image_url, same contract as the visitor widget.
  const uploadImage = async (file: File) => {
    if (uploading || !selectedId || !selected || selected.status === "closed") {
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const r = await fetch("/admin/chat/attachments", {
        method: "POST",
        body: formData,
      })
      const data = (await r.json().catch(() => null)) as {
        url?: string
        name?: string
        message?: string
      } | null
      if (!r.ok || !data?.url) {
        throw new Error(data?.message || r.statusText)
      }
      setPendingImage({ url: data.url, name: data.name || file.name })
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message })
    } finally {
      setUploading(false)
    }
  }

  const send = async () => {
    const body = draft.trim()
    if ((!body && !pendingImage) || !selectedId || sending) {
      return
    }
    setSending(true)
    try {
      const r = await fetch(
        `/admin/chat/conversations/${selectedId}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            body,
            ...(pendingImage ? { image_url: pendingImage.url } : {}),
          }),
        }
      )
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      setDraft("")
      setPendingImage(null)
      await loadThread(selectedId)
      // Clicking Send moves focus to the button; put it back in the
      // composer so the operator can keep typing without another click.
      inputRef.current?.focus()
    } catch (e) {
      toast.error("Reply failed", { description: (e as Error).message })
    } finally {
      setSending(false)
    }
  }

  const setStatus = async (status: "open" | "closed") => {
    if (!selectedId) {
      return
    }
    try {
      const r = await fetch(`/admin/chat/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!r.ok) {
        const data = (await r.json()) as { message?: string }
        throw new Error(data.message || r.statusText)
      }
      await loadList()
      await loadThread(selectedId)
    } catch (e) {
      toast.error("Update failed", { description: (e as Error).message })
    }
  }

  // Hard-delete a closed conversation (messages included). Only reachable
  // from the closed state, so a live thread can't be dropped by accident.
  // The confirmation lives in the Prompt modal, not window.confirm.
  const remove = async () => {
    if (!selectedId) {
      return
    }
    try {
      const r = await fetch(`/admin/chat/conversations/${selectedId}`, {
        method: "DELETE",
      })
      if (!r.ok) {
        const data = (await r.json()) as { message?: string }
        throw new Error(data.message || r.statusText)
      }
      toast.success("Conversation deleted")
      setSelectedId(null)
      setMessages([])
      await loadList()
    } catch (e) {
      toast.error("Delete failed", { description: (e as Error).message })
    }
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const allListedSelected =
    conversations.length > 0 &&
    conversations.every((c) => selectedIds.has(c.id))

  const toggleAll = () => {
    setSelectedIds(
      allListedSelected ? new Set() : new Set(conversations.map((c) => c.id))
    )
  }

  const exitSelect = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const bulkAction = async (action: "read" | "close" | "delete") => {
    const ids = Array.from(selectedIds)
    if (!ids.length) {
      return
    }
    try {
      const r = await fetch("/admin/chat/conversations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ids }),
      })
      const data = (await r.json()) as {
        updated?: number
        deleted?: number
        skipped?: number
        message?: string
      }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      if (action === "delete") {
        toast.success(
          `Deleted ${data.deleted ?? 0} conversation(s)`,
          (data.skipped ?? 0) > 0
            ? {
                description: `${data.skipped} skipped — close them before deleting.`,
              }
            : undefined
        )
      } else if (action === "read") {
        toast.success(`Marked ${data.updated ?? 0} conversation(s) as read`)
      } else {
        toast.success(`Closed ${data.updated ?? 0} conversation(s)`)
      }
      // The open thread may point at a conversation the bulk action
      // closed or deleted — clear it so the pane doesn't keep polling
      // a row the list no longer contains.
      if (selectedId && selectedIds.has(selectedId) && action !== "read") {
        setSelectedId(null)
        setMessages([])
      }
      setSelectedIds(new Set())
      await loadList()
    } catch (e) {
      toast.error("Bulk action failed", { description: (e as Error).message })
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Container>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Heading level="h1">Live Chat</Heading>
            <Text className="mt-1 text-ui-fg-subtle">
              Visitor conversations from the storefront widget. You are online
              while this page is open (presence refreshes every minute).
            </Text>
          </div>
          <Badge color={connected ? "green" : "red"}>
            {connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
        {error && <Text className="mt-2 text-ui-fg-error">{error}</Text>}
        <div className="mt-4 flex items-center gap-2">
          {(["open", "closed", "all"] as StatusFilter[]).map((key) => (
            <Button
              key={key}
              variant={filter === key ? "primary" : "secondary"}
              size="small"
              onClick={() => {
                setFilter(key)
                // Selection is scoped to what the operator was looking at.
                setSelectedIds(new Set())
              }}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Button>
          ))}
          {!selectMode && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => setSelectMode(true)}
            >
              Select
            </Button>
          )}
        </div>
      </Container>

      {selectMode && (
        <Container className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={
                allListedSelected
                  ? true
                  : selectedIds.size > 0
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={() => toggleAll()}
              aria-label="Select all conversations in the list"
            />
            <Text size="small">All</Text>
          </label>
          <Text size="small" className="text-ui-fg-subtle">
            {selectedIds.size} selected
          </Text>
          <div className="ml-auto flex items-center gap-2">
            {(filter === "open" || filter === "all") && (
              <>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={!selectedIds.size}
                  onClick={() => void bulkAction("read")}
                >
                  Mark read
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={!selectedIds.size}
                  onClick={() => void bulkAction("close")}
                >
                  Close chat
                </Button>
              </>
            )}
            {filter === "closed" && (
              <Button
                size="small"
                variant="danger"
                disabled={!selectedIds.size}
                onClick={() => void bulkAction("delete")}
              >
                Delete
              </Button>
            )}
            <Button size="small" variant="transparent" onClick={exitSelect}>
              Cancel
            </Button>
          </div>
        </Container>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px,1fr]">
        <Container className="max-h-[70vh] overflow-y-auto p-0">
          {loadingList && (
            <Text className="p-4 text-ui-fg-subtle">Loading…</Text>
          )}
          {!loadingList && conversations.length === 0 && (
            <Text className="p-4 text-ui-fg-subtle">No conversations yet.</Text>
          )}
          <ul>
            {conversations.map((c) => (
              <li key={c.id} className="flex border-b border-ui-border-subtle">
                {selectMode && (
                  <label className="flex w-10 shrink-0 cursor-pointer items-center justify-center">
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleRow(c.id)}
                      aria-label={`Select chat with ${displayName(c)}`}
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`min-w-0 flex-1 px-4 py-3 text-left transition-colors hover:bg-ui-bg-subtle ${
                    selectedId === c.id ? "bg-ui-bg-subtle" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Text weight="plus" className="truncate">
                      {displayName(c)}
                    </Text>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {c.admin_unread > 0 && (
                        <Badge color="red" size="xsmall">
                          {c.admin_unread}
                        </Badge>
                      )}
                      <Text size="small" className="text-ui-fg-subtle">
                        {timeLabel(c.last_message_at)}
                      </Text>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      size="xsmall"
                      color={c.status === "open" ? "green" : "grey"}
                    >
                      {c.status}
                    </Badge>
                    <Text
                      size="small"
                      className="truncate text-ui-fg-subtle"
                    >
                      {c.last_message
                        ? `${c.last_message.sender_type === "admin" ? "You: " : ""}${c.last_message.body || "Image"}`
                        : "No messages yet"}
                    </Text>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Container>

        <Container className="flex max-h-[70vh] flex-col p-0">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <Text className="text-ui-fg-subtle">
                Select a conversation to reply.
              </Text>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-ui-border-subtle px-4 py-3">
                <div className="min-w-0">
                  <Text weight="plus" className="truncate">
                    {displayName(selected)}
                  </Text>
                  {selected.guest_email && (
                    <Text size="small" className="text-ui-fg-subtle">
                      {selected.guest_email}
                    </Text>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {selected.status === "closed" && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      void setStatus(selected.status === "open" ? "closed" : "open")
                    }
                  >
                    {selected.status === "open" ? "Close" : "Reopen"}
                  </Button>
                </div>
              </div>

              <div
                ref={threadRef}
                className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
              >
                {messages.length === 0 && (
                  <Text className="text-ui-fg-subtle">No messages yet.</Text>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.sender_type === "admin" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Admin replies use the primary-button surface
                        (bg-ui-button-inverted + contrast text) — the same
                        tokens every Button renders, so they're guaranteed
                        in the compiled CSS and high-contrast in both
                        themes. bg-ui-bg-brand was near-invisible on the
                        dark base. */}
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        m.sender_type === "admin"
                          ? "bg-ui-button-inverted text-ui-contrast-fg-primary"
                          : "bg-ui-bg-subtle"
                      }`}
                    >
                      <Text
                        size="small"
                        className={
                          m.sender_type === "admin"
                            ? "opacity-70"
                            : "text-ui-fg-subtle"
                        }
                      >
                        {m.sender_label || m.sender_type} ·{" "}
                        {timeLabel(m.created_at)}
                      </Text>
                      {m.image_url && (
                        <a
                          href={m.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="my-1 block"
                        >
                          <img
                            src={m.image_url}
                            alt={m.body || "Chat image"}
                            className="max-h-64 max-w-full rounded-md object-contain"
                            loading="lazy"
                          />
                        </a>
                      )}
                      {m.body && (
                        <Text className="whitespace-pre-wrap break-words">
                          {m.body}
                        </Text>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-ui-border-subtle p-3">
                <Label htmlFor="chat-reply" className="sr-only">
                  Reply
                </Label>
                {pendingImage && (
                  <div className="mb-2 flex items-center gap-2 rounded-md border border-ui-border-subtle bg-ui-bg-subtle p-2">
                    <img
                      src={pendingImage.url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                    <Text size="small" className="min-w-0 flex-1 truncate">
                      {pendingImage.name}
                    </Text>
                    <Button
                      variant="transparent"
                      size="small"
                      onClick={() => setPendingImage(null)}
                      aria-label="Remove image"
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {/* Medusa UI's Input renders inside a wrapper div, so the
                    growth class belongs on our own flex child — putting it
                    on the Input itself styles the inner <input> and leaves
                    the row at its default content width. */}
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
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      uploading || sending || selected.status === "closed"
                    }
                    aria-label="Attach image"
                  >
                    {uploading ? "Uploading…" : "Attach"}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <Input
                      id="chat-reply"
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          void send()
                        }
                      }}
                      placeholder={
                        selected.status === "closed"
                          ? "Conversation closed — reopen to reply"
                          : "Type a reply…"
                      }
                      disabled={selected.status === "closed" || sending}
                    />
                  </div>
                  <Button
                    onClick={() => void send()}
                    disabled={
                      (!draft.trim() && !pendingImage) ||
                      sending ||
                      selected.status === "closed"
                    }
                  >
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </Container>
      </div>

      {/* Delete confirmation. Radix AlertDialog: Action closes the dialog
          itself, so remove() only has to talk to the API. */}
      <Prompt
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        variant="danger"
      >
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Delete conversation?</Prompt.Title>
            <Prompt.Description>
              This permanently removes the conversation and its messages.
              This cannot be undone.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Prompt.Action onClick={() => void remove()}>
              Delete
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Live Chat",
  icon: RouteIcon,
})

export default LiveChatPage

import { MedusaError, Modules } from "@medusajs/framework/utils"
import type ChatModuleService from "./service"

// Shared serialization + resolution helpers used by the store and admin
// chat routes. Kept in the module folder (not api/) so the routes stay
// thin and the shapes have one definition.

export type ChatConversationRow = {
  id: string
  customer_id: string | null
  guest_name: string | null
  guest_email: string | null
  visitor_token: string | null
  status: string
  admin_unread: number
  visitor_unread: number
  last_message_at: string | Date | null
  created_at?: string | Date
}

export type ChatMessageRow = {
  id: string
  conversation_id: string
  sender_type: string
  sender_label: string | null
  body: string
  image_url?: string | null
  created_at?: string | Date
}

const iso = (v: string | Date | null | undefined): string | null =>
  v == null ? null : typeof v === "string" ? v : v.toISOString()

// Widget-facing view: never leaks customer_id, guest contact details, or
// the unread counters the operator uses (visitor sees its own via fetch).
export const serializeConversationStore = (row: ChatConversationRow) => ({
  id: row.id,
  status: row.status,
  last_message_at: iso(row.last_message_at),
  visitor_unread: row.visitor_unread ?? 0,
})

export const serializeConversationAdmin = (row: ChatConversationRow) => ({
  id: row.id,
  customer_id: row.customer_id,
  guest_name: row.guest_name,
  guest_email: row.guest_email,
  status: row.status,
  admin_unread: row.admin_unread ?? 0,
  last_message_at: iso(row.last_message_at),
  created_at: iso(row.created_at),
})

export const serializeMessage = (row: ChatMessageRow) => ({
  id: row.id,
  sender_type: row.sender_type,
  sender_label: row.sender_label,
  body: row.body,
  image_url: row.image_url ?? null,
  created_at: iso(row.created_at),
})

// Capability token from header (fetch-stream client) or query (debug /
// simple EventSource-style callers). The store routes that need a token
// receive it as an argument; this is the extraction point.
export const extractToken = (
  req: { headers: Record<string, unknown>; query: Record<string, unknown> }
): string | null => {
  const header = req.headers["x-chat-token"]
  if (typeof header === "string" && header) {
    return header
  }
  const q = req.query?.token
  if (typeof q === "string" && q) {
    return q
  }
  return null
}

// Resolve a conversation by capability token first (guests), else by the
// authenticated customer id (members whose localStorage was cleared).
export const resolveConversation = async (
  chat: ChatModuleService,
  opts: { token?: string | null; actorId?: string | null }
): Promise<ChatConversationRow | null> => {
  if (opts.token) {
    const rows = (await chat.listChatConversations(
      { visitor_token: opts.token },
      { take: 1 }
    )) as ChatConversationRow[]
    if (rows.length) {
      return rows[0]
    }
  }
  if (opts.actorId) {
    const rows = (await chat.listChatConversations(
      { customer_id: opts.actorId },
      { take: 1, order: { last_message_at: "DESC" } }
    )) as ChatConversationRow[]
    if (rows.length) {
      return rows[0]
    }
  }
  return null
}

export type ChatUploadFile = {
  originalname: string
  mimetype: string
  buffer: Buffer
}

// Image uploads ride the file-local provider into <cwd>/static under the
// chat/ prefix (same pattern as banners). Only the relative path is
// persisted (/static/chat/<key>) — the storefront prefixes its backend URL
// and the admin is same-origin, so no localhost origin leaks into rows.
// jpeg/png/webp/gif, 5MB cap (multer's global limit is 8MB).
export const storeChatImage = async (
  req: {
    scope: {
      resolve: (key: string) => {
        createFiles: (data: Record<string, unknown>) => Promise<{ id: string }>
      }
    }
  },
  file: ChatUploadFile
): Promise<string> => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]
  if (!allowed.includes(file.mimetype)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "chat image must be JPEG, PNG, WebP, or GIF"
    )
  }
  if (file.buffer.length > 5 * 1024 * 1024) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "chat image must be under 5MB"
    )
  }
  const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")
  const fileModule = req.scope.resolve(Modules.FILE)
  const created = await fileModule.createFiles({
    filename: `chat/${Date.now()}-${safe}`,
    mimeType: file.mimetype,
    content: file.buffer,
    access: "public",
  })
  // Forward slashes always: path.join on Windows emits backslashes, which
  // are fragile in URLs behind some proxies/CDNs.
  return `/static/${created.id.replace(/\\/g, "/")}`
}

// Hard-delete one conversation with its messages, plus the process-local
// rate history. Soft-delete matches the retention job; the partial unique
// index on visitor_token (WHERE deleted_at IS NULL) frees the token.
// Shared by the single-conversation DELETE and the bulk action route.
export const deleteConversationRows = async (
  chat: ChatModuleService,
  id: string
): Promise<void> => {
  // The generated delete takes ids, so drain the thread in batches (the
  // list query hides rows as they soft-delete, so the loop terminates).
  for (;;) {
    const batch = (await chat.listChatMessages(
      { conversation_id: id },
      { take: 100 }
    )) as ChatMessageRow[]
    if (!batch.length) {
      break
    }
    await chat.deleteChatMessages(batch.map((m) => m.id))
  }
  await chat.deleteChatConversations([id])
  await chat.forgetConversation(id)
}

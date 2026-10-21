import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveChat } from "../../../../modules/chat/resolve"
import {
  deleteConversationRows,
  serializeConversationAdmin,
  serializeMessage,
} from "../../../../modules/chat/route-helpers"
import type {
  ChatConversationRow,
  ChatMessageRow,
} from "../../../../modules/chat/route-helpers"

// Operator inbox: conversation list ordered by last activity, with the
// newest message as preview. ?status=open|closed|all (default all).
// Admins also call PATCH /admin/chat/presence to keep the store-facing
// "online" flag fresh.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const status = String(req.query.status ?? "all")
  const filters: Record<string, unknown> = {}
  if (status === "open" || status === "closed") {
    filters.status = status
  }
  const rows = (await chat.listChatConversations(filters, {
    take: 100,
    order: { last_message_at: "DESC" },
  })) as ChatConversationRow[]

  const ids = rows.map((row) => row.id)
  const previews = new Map<string, ChatMessageRow>()
  if (ids.length) {
    // Newest messages first; walking the DESC list fills each conversation's
    // first-seen (= latest) message. A flat take of ids.length would let one
    // chatty conversation starve the others of previews.
    const messages = (await chat.listChatMessages(
      { conversation_id: { $in: ids } },
      { take: 200, order: { created_at: "DESC" } }
    )) as ChatMessageRow[]
    for (const message of messages) {
      if (!previews.has(message.conversation_id)) {
        previews.set(message.conversation_id, message)
      }
    }
  }

  res.status(200).json({
    conversations: rows.map((row) => ({
      ...serializeConversationAdmin(row),
      last_message: previews.get(row.id)
        ? serializeMessage(previews.get(row.id)!)
        : null,
    })),
  })
}

// Bulk operator actions over the inbox selection:
//   read   — clear admin_unread on each conversation
//   close  — set status=closed (already-closed ones are skipped)
//   delete — hard-delete closed conversations only; open ones are
//            reported as skipped so a mixed selection can't drop a
//            live thread by accident (same guard as the single DELETE)
const BULK_MAX_IDS = 200

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const body = (req.body ?? {}) as Record<string, unknown>
  const action = body.action
  if (action !== "read" && action !== "close" && action !== "delete") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'action must be "read", "close", or "delete"'
    )
  }
  const ids = Array.isArray(body.ids)
    ? body.ids.filter(
        (v): v is string => typeof v === "string" && v.length > 0
      )
    : []
  if (!ids.length || ids.length > BULK_MAX_IDS) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `ids must contain 1 to ${BULK_MAX_IDS} conversation ids`
    )
  }

  // Update/delete only rows that still exist (the UI selection can go
  // stale against the 5s list poll — a just-deleted id is skipped, not
  // an error).
  const rows = (await chat.listChatConversations(
    { id: { $in: ids } },
    { take: BULK_MAX_IDS }
  )) as ChatConversationRow[]

  if (action === "read") {
    for (const row of rows) {
      if ((row.admin_unread ?? 0) > 0) {
        await chat.updateChatConversations({ id: row.id, admin_unread: 0 })
      }
    }
    res.status(200).json({ updated: rows.length })
    return
  }

  if (action === "close") {
    const open = rows.filter((row) => row.status !== "closed")
    for (const row of open) {
      await chat.updateChatConversations({ id: row.id, status: "closed" })
    }
    res.status(200).json({ updated: open.length })
    return
  }

  const closed = rows.filter((row) => row.status === "closed")
  for (const row of closed) {
    await deleteConversationRows(chat, row.id)
  }
  res.status(200).json({
    deleted: closed.length,
    skipped: ids.length - closed.length,
  })
}

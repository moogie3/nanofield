import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveChat } from "../../../../../../modules/chat/resolve"
import {
  extractToken,
  resolveConversation,
  serializeMessage,
} from "../../../../../../modules/chat/route-helpers"
import { normalizeBody, normalizeImageRef } from "../../../../../../modules/chat/guards"
import type { ChatMessageRow } from "../../../../../../modules/chat/route-helpers"
import { notifyFeed } from "../../../../../admin/shopee-imports/notify"

const actorIdOf = (req: MedusaRequest): string | null =>
  (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
    ?.actor_id ?? null

// Backfill since a cursor (message id). Returns up to 100 newer messages
// plus a next_cursor (the last id, for the next poll). Also clears the
// visitor_unread counter — the widget is caught up by definition.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const conversation = await resolveConversation(chat, {
    token: extractToken(req as never),
    actorId: actorIdOf(req),
  })
  if (!conversation) {
    res.status(200).json({ messages: [], next_cursor: null })
    return
  }

  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null
  const filters: Record<string, unknown> = {
    conversation_id: conversation.id,
  }
  if (cursor) {
    // Message ids are ULIDs — lexicographic order matches creation order,
    // so $gt cleanly selects "everything after the client's cursor".
    filters.id = { $gt: cursor }
  }
  const rows = (await chat.listChatMessages(filters, {
    take: 100,
    order: { created_at: "DESC" },
  })) as ChatMessageRow[]

  // When backfilling the tail (no cursor) reset the unread badge; with a
  // cursor the client is syncing, not "reading".
  if (!cursor && conversation.visitor_unread > 0) {
    await chat
      .updateChatConversations({ id: conversation.id, visitor_unread: 0 })
      .catch(() => {})
  }

  // Newest id first (DESC) — capture before reverse() mutates the array.
  const nextCursor = rows.length ? rows[0].id : cursor

  res.status(200).json({
    messages: rows.reverse().map(serializeMessage),
    next_cursor: nextCursor,
  })
}

// Visitor sends a message. Authz = capability token OR customer session.
// Guards: body length, per-conversation rate limit (429). On success the
// admin_unread counter ticks, last_message_at moves, the in-process emitter
// fires (SSE pushes), and the admin bell gets a feed row.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const conversation = await resolveConversation(chat, {
    token: extractToken(req as never),
    actorId: actorIdOf(req),
  })
  if (!conversation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "no chat conversation for this token"
    )
  }
  if (conversation.status === "closed") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "this conversation is closed"
    )
  }

  const raw = (req.body ?? {}) as Record<string, unknown>
  const image = normalizeImageRef(raw.image_url)
  if (!image.ok) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, image.error)
  }
  // Body may be empty only when an image is attached (image-only message).
  const body = normalizeBody(raw.body, { allowEmpty: Boolean(image.value) })
  if (!body.ok) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, body.error)
  }
  if (!(await chat.consumeVisitorRate(conversation.id))) {
    res.status(429).json({ message: "sending too fast — wait a moment" })
    return
  }

  const senderLabel =
    conversation.guest_name || conversation.customer_id?.slice(0, 8) || "Guest"
  // One feed alert per conversation: only the first visitor message
  // notifies the admin ("new chat"). Later messages still tick
  // admin_unread (the inbox/sidebar badges count those) but stay silent.
  const prior = (await chat.listChatMessages(
    { conversation_id: conversation.id },
    { take: 1 }
  )) as ChatMessageRow[]
  const message = (await chat.createChatMessages({
    conversation_id: conversation.id,
    sender_type: "visitor",
    sender_label: senderLabel,
    body: body.value,
    image_url: image.value || null,
  })) as ChatMessageRow

  const updated = (await chat.updateChatConversations({
    id: conversation.id,
    admin_unread: (conversation.admin_unread ?? 0) + 1,
    last_message_at: new Date(),
  })) as ChatConversationRowLite

  await chat.publishMessage({
    type: "message",
    conversation_id: conversation.id,
    message: {
      id: message.id,
      sender_type: message.sender_type,
      sender_label: message.sender_label,
      body: message.body,
      image_url: message.image_url ?? null,
      created_at:
        typeof message.created_at === "string"
          ? message.created_at
          : message.created_at?.toISOString() ?? new Date().toISOString(),
    },
  })

  const preview = body.value
    ? body.value.length > 120
      ? `${body.value.slice(0, 120)}…`
      : body.value
    : "[image]"
  if (!prior.length) {
    void notifyFeed(req.scope, {
      to: "",
      title: "New live chat",
      description: `${senderLabel}: ${preview}`,
      data: { link: `/app/live-chat?conversation=${conversation.id}` },
    })
  }

  res.status(201).json({
    message: serializeMessage(message),
    conversation: {
      id: updated.id,
      status: updated.status,
      last_message_at:
        typeof updated.last_message_at === "string"
          ? updated.last_message_at
          : updated.last_message_at?.toISOString() ?? null,
    },
  })
}

type ChatConversationRowLite = {
  id: string
  status: string
  last_message_at: string | Date | null
}

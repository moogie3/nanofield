import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveChat } from "../../../../../../modules/chat/resolve"
import {
  serializeMessage,
} from "../../../../../../modules/chat/route-helpers"
import { normalizeBody, normalizeImageRef } from "../../../../../../modules/chat/guards"
import type {
  ChatConversationRow,
  ChatMessageRow,
} from "../../../../../../modules/chat/route-helpers"

// Operator reply. Pushes to the visitor through the emitter (SSE) and
// bumps visitor_unread so the widget can badge a closed panel.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const id = String(req.params.id || "")

  const rows = (await chat.listChatConversations(
    { id },
    { take: 1 }
  )) as ChatConversationRow[]
  if (!rows.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `chat conversation ${id} was not found`
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

  // Shown to the visitor as the desk name. A generic "Agent" — the
  // operator's internal id has no meaning on the storefront side.
  const senderLabel = "Agent"
  const message = (await chat.createChatMessages({
    conversation_id: id,
    sender_type: "admin",
    sender_label: senderLabel,
    body: body.value,
    image_url: image.value || null,
  })) as ChatMessageRow

  const updated = (await chat.updateChatConversations({
    id,
    visitor_unread: (rows[0].visitor_unread ?? 0) + 1,
    last_message_at: new Date(),
  })) as ChatConversationRow

  await chat.publishMessage({
    type: "message",
    conversation_id: id,
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

  res.status(201).json({
    message: serializeMessage(message),
    conversation: {
      id: updated.id,
      status: updated.status,
      visitor_unread: updated.visitor_unread,
    },
  })
}

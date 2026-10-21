import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveChat } from "../../../../../modules/chat/resolve"
import {
  deleteConversationRows,
  serializeConversationAdmin,
  serializeMessage,
} from "../../../../../modules/chat/route-helpers"
import type {
  ChatConversationRow,
  ChatMessageRow,
} from "../../../../../modules/chat/route-helpers"

const retrieve = async (req: MedusaRequest, id: string) => {
  const rows = (await resolveChat(req).listChatConversations(
    { id },
    { take: 1 }
  )) as ChatConversationRow[]
  if (!rows.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `chat conversation ${id} was not found`
    )
  }
  return rows[0]
}

// Full thread. Opening a conversation clears admin_unread (operator has
// seen the visitor messages).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const id = String(req.params.id || "")
  const conversation = await retrieve(req, id)
  if (conversation.admin_unread > 0) {
    await chat
      .updateChatConversations({ id, admin_unread: 0 })
      .catch(() => {})
  }
  const messages = (await chat.listChatMessages(
    { conversation_id: id },
    { take: 200, order: { created_at: "ASC" } }
  )) as ChatMessageRow[]
  res.status(200).json({
    conversation: serializeConversationAdmin(conversation),
    messages: messages.map(serializeMessage),
  })
}

// Open / close. Closing blocks further visitor sends (route answers 403)
// but the thread stays readable; reopening resumes.
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const id = String(req.params.id || "")
  await retrieve(req, id)
  const status = (req.body as Record<string, unknown>)?.status
  if (status !== "open" && status !== "closed") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'status must be "open" or "closed"'
    )
  }
  const updated = (await chat.updateChatConversations({
    id,
    status,
  })) as ChatConversationRow
  res.status(200).json({ conversation: serializeConversationAdmin(updated) })
}

// Hard-delete a closed conversation and its messages. Open conversations
// are refused (close first) so a live thread can't be dropped by accident.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const id = String(req.params.id || "")
  const conversation = await retrieve(req, id)
  if (conversation.status !== "closed") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "close the conversation before deleting it"
    )
  }
  await deleteConversationRows(chat, id)
  res.status(200).json({ id, deleted: true })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveChat } from "../../../../../../modules/chat/resolve"
import {
  extractToken,
  resolveConversation,
  storeChatImage,
} from "../../../../../../modules/chat/route-helpers"
import type { ChatUploadFile } from "../../../../../../modules/chat/route-helpers"

// Visitor image upload (multipart, field `file`). Authz = capability token
// or customer session, same as the messages route. The returned relative
// path goes into a subsequent message POST as image_url — upload and send
// are separate so the widget can preview before sending. Rate-limited with
// the same per-conversation budget as messages (429 when speaking too fast).
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const actorId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id
  const conversation = await resolveConversation(chat, {
    token: extractToken(req as never),
    actorId,
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

  const file = (req as unknown as { file?: ChatUploadFile }).file
  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "image file is required (multipart field: file)"
    )
  }
  if (!(await chat.consumeVisitorRate(conversation.id))) {
    res.status(429).json({ message: "uploading too fast — wait a moment" })
    return
  }

  const url = await storeChatImage(req, file)
  res.status(201).json({
    url,
    name: file.originalname,
    mime: file.mimetype,
    size: file.buffer.length,
  })
}

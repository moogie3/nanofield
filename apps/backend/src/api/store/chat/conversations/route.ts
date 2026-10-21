import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveChat } from "../../../../modules/chat/resolve"
import {
  extractToken,
  resolveConversation,
  serializeConversationStore,
  serializeMessage,
} from "../../../../modules/chat/route-helpers"
import {
  generateVisitorToken,
  normalizeProfile,
} from "../../../../modules/chat/guards"
import type {
  ChatConversationRow,
  ChatMessageRow,
} from "../../../../modules/chat/route-helpers"

// Start or resume a chat. Order: capability token (guest localStorage) →
// authenticated customer → create new. The token is minted server-side and
// returned; the client stores it. Guests may pass a name/email (optional);
// customers get their id attached from the auth context, guests leave it
// null. Returns the conversation plus the last 50 messages so a reconnect
// shows the full thread without a second request.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const actorId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id

  const token = extractToken(req as never) ?? null
  const profile = normalizeProfile(
    (req.body as Record<string, unknown>)?.name,
    (req.body as Record<string, unknown>)?.email
  )

  const existing = await resolveConversation(chat, { token, actorId })

  if (existing) {
    // Resume: refresh the guest profile only when it was empty before; if
    // a token exists keep it (localStorage already holds it).
    const patch: Record<string, unknown> = {}
    if (!existing.guest_name && profile.name) {
      patch.guest_name = profile.name
    }
    if (!existing.guest_email && profile.email) {
      patch.guest_email = profile.email
    }
    if (!existing.visitor_token) {
      patch.visitor_token = token ?? generateVisitorToken()
    }
    // Resuming means the visitor is looking at the thread — clear the
    // widget's unread counter along with the snapshot.
    if (existing.visitor_unread > 0) {
      patch.visitor_unread = 0
    }
    let conversation: ChatConversationRow = existing
    if (Object.keys(patch).length) {
      conversation = (await chat.updateChatConversations({
        id: existing.id,
        ...patch,
      })) as ChatConversationRow
    }
    const messages = (await chat.listChatMessages(
      { conversation_id: conversation.id },
      { take: 50, order: { created_at: "DESC" } }
    )) as ChatMessageRow[]
    res.status(200).json({
      conversation: serializeConversationStore(conversation),
      token: conversation.visitor_token,
      messages: messages.reverse().map(serializeMessage),
    })
    return
  }

  // No token and no customer session — mint a new conversation.
  const newToken = token ?? generateVisitorToken()
  const conversation = (await chat.createChatConversations({
    visitor_token: newToken,
    customer_id: actorId ?? null,
    guest_name: profile.name,
    guest_email: profile.email,
    status: "open",
    admin_unread: 0,
    visitor_unread: 0,
    last_message_at: new Date(),
  })) as ChatConversationRow
  if (!conversation?.id) {
    res.status(500).json({ message: "failed to create conversation" })
    return
  }
  res.status(200).json({
    conversation: serializeConversationStore(conversation),
    token: conversation.visitor_token,
    messages: [],
  })
}

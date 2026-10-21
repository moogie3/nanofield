import { EventEmitter } from "events"
import { MedusaService } from "@medusajs/framework/utils"
import { ChatConversation } from "./models/chat-conversation"
import { ChatMessage } from "./models/chat-message"
import {
  CHAT_RATE_WINDOW_MS,
  pruneRateHistory,
  rateLimitOk,
} from "./guards"

// How long an admin may stay quiet before the store sees "offline".
const PRESENCE_WINDOW_MS = 180_000

export type ChatStreamEvent = {
  type: "message"
  conversation_id: string
  message: {
    id: string
    sender_type: string
    sender_label: string | null
    body: string
    image_url: string | null
    created_at: string
  }
}

// CRUD surface (list/create/update/delete ChatConversations + ChatMessages)
// plus the live layer: an in-process emitter the SSE routes subscribe to,
// an admin-presence map heartbeated from the admin UI, and a per-conversation
// visitor rate limit. Presence and the emitter are process-local on purpose:
// the storefront runs a single backend replica; Redis pub/sub is the scale
// path if that ever changes.
// Public methods are async to satisfy @medusajs/service-methods-must-be-async;
// the work they do is synchronous in-memory state.
class ChatModuleService extends MedusaService({
  ChatConversation,
  ChatMessage,
}) {
  private readonly emitter = new EventEmitter()
  private readonly presence = new Map<string, number>()
  private readonly rateHistory = new Map<string, number[]>()

  constructor(container: Record<string, unknown>) {
    super(...([container] as [Record<string, unknown>]))
    this.emitter.setMaxListeners(0)
  }

  async publishMessage(event: ChatStreamEvent): Promise<void> {
    this.emitter.emit("chat-message", event)
  }

  async subscribeMessages(
    listener: (event: ChatStreamEvent) => void
  ): Promise<() => void> {
    this.emitter.on("chat-message", listener)
    return () => {
      this.emitter.off("chat-message", listener)
    }
  }

  async heartbeatAdmin(adminId: string, now = Date.now()): Promise<void> {
    this.presence.set(adminId, now)
  }

  // Explicit logout / unmount path: drop this admin's heartbeat now
  // instead of letting the window expire, so the storefront flips to
  // Away immediately when the last operator leaves.
  async releaseAdmin(adminId: string): Promise<void> {
    this.presence.delete(adminId)
  }

  async isAdminOnline(now = Date.now()): Promise<boolean> {
    for (const seenAt of this.presence.values()) {
      if (now - seenAt < PRESENCE_WINDOW_MS) {
        return true
      }
    }
    return false
  }

  // Returns true if the visitor may send another message now (and records
  // the send). False = they are speaking too fast; route answers 429.
  async consumeVisitorRate(
    conversationId: string,
    now = Date.now()
  ): Promise<boolean> {
    const history = this.rateHistory.get(conversationId) ?? []
    const ok = rateLimitOk(history, now)
    const next = pruneRateHistory(history, now, CHAT_RATE_WINDOW_MS)
    if (ok) {
      next.push(now)
    }
    this.rateHistory.set(conversationId, next)
    return ok
  }

  // Drop the per-conversation rate history when a conversation is deleted
  // so the process-local map doesn't accumulate dead keys.
  async forgetConversation(conversationId: string): Promise<void> {
    this.rateHistory.delete(conversationId)
  }
}

export default ChatModuleService

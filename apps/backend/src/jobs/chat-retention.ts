import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

// Chat retention: deletes conversations (and their messages) older than
// CHAT_RETENTION_DAYS (default 90, daily 03:30). Messages are deleted
// first per conversation so no orphan rows remain. A run never throws.
// Set CHAT_RETENTION_DAYS=0 to disable.
const retentionDays = () => {
  const n = Number(process.env.CHAT_RETENTION_DAYS ?? 90)
  if (!Number.isFinite(n) || n < 0) {
    return 90
  }
  return Math.floor(n)
}

type ChatConversationRow = {
  id: string
  created_at?: string
}

type ChatMessageRow = { id: string }

export default async function chatRetentionJob(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const days = retentionDays()
    if (days === 0) {
      return
    }
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const chat = container.resolve("chat") as unknown as {
      listChatConversations: (
        filters: Record<string, unknown>,
        config?: Record<string, unknown>
      ) => Promise<ChatConversationRow[]>
      listChatMessages: (
        filters: Record<string, unknown>,
        config?: Record<string, unknown>
      ) => Promise<ChatMessageRow[]>
      deleteChatConversations: (ids: string[]) => Promise<void>
      deleteChatMessages: (ids: string[]) => Promise<void>
    }
    // Oldest-first batches; the first fresh conversation ends the run
    // (everything after it is newer). Batch cap bounds a single run.
    const TAKE = 200
    const MAX_BATCHES = 4
    let deletedConversations = 0
    let deletedMessages = 0
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const rows = await chat.listChatConversations(
        {},
        { take: TAKE, order: { created_at: "ASC" } }
      )
      if (!rows.length) {
        break
      }
      const stale = rows.filter(
        (r) => r?.id && r.created_at && new Date(r.created_at).getTime() < cutoff
      )
      if (stale.length) {
        for (const conversation of stale) {
          const messages = await chat.listChatMessages(
            { conversation_id: conversation.id },
            { take: 1000 }
          )
          if (messages.length) {
            await chat.deleteChatMessages(messages.map((m) => m.id))
            deletedMessages += messages.length
          }
        }
        await chat.deleteChatConversations(stale.map((r) => r.id))
        deletedConversations += stale.length
      }
      if (stale.length < rows.length) {
        break
      }
    }
    if (deletedConversations > 0 || deletedMessages > 0) {
      logger.info(
        `chat-retention: deleted ${deletedConversations} conversation(s) and ${deletedMessages} message(s) older than ${days}d`
      )
    }
  } catch (e) {
    logger.error(`chat-retention: run failed — ${(e as Error).message}`)
  }
}

export const config = {
  name: "chat-retention",
  schedule: process.env.CHAT_RETENTION_CRON || "30 3 * * *",
}

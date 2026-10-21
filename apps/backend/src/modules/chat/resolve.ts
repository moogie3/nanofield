import type { MedusaRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type ChatModuleService from "./service"

// Resolves the chat module service through whichever alias the container
// exposes. Mirrors resolveContent: routes keep working across Medusa
// registration changes, and a clear error fires when the module is not
// loaded (backend booted before registration / migrations were run).
const CHAT_KEYS_SVC = ["chat", "chatModuleService"]

export const resolveChat = (req: MedusaRequest): ChatModuleService => {
  const resolve = req.scope.resolve as unknown as (
    key: string
  ) => ChatModuleService | null
  for (const key of CHAT_KEYS_SVC) {
    try {
      const svc = resolve(key)
      if (svc && typeof svc.listChatConversations === "function") {
        return svc
      }
    } catch {
      // try the next key
    }
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "chat module is not loaded"
  )
}

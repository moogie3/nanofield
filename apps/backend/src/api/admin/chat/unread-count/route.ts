import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveChat } from "../../../../modules/chat/resolve"
import type { ChatConversationRow } from "../../../../modules/chat/route-helpers"

// Lightweight badge count for the admin sidebar: total unread visitor
// messages across all conversations. No previews, no serialization — the
// feed companion polls this every ~10s, so keep it to one list call.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const rows = (await chat.listChatConversations({}, {
    take: 100,
  })) as ChatConversationRow[]
  const count = rows.reduce(
    (sum, row) => sum + (row.admin_unread ?? 0),
    0
  )
  res.status(200).json({ count })
}

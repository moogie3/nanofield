import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveChat } from "../../../../modules/chat/resolve"

// Widget presence probe. Public (publishable key only) — "is anyone at
// the desk right now". The flag drives the WhatsApp-offline fallback.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  res.status(200).json({ online: await chat.isAdminOnline() })
}

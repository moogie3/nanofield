import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveChat } from "../../../../modules/chat/resolve"
import {
  extractToken,
  resolveConversation,
} from "../../../../modules/chat/route-helpers"

// Server-Sent Events stream for one conversation. Authz = the capability
// token (query ?token= or x-chat-token header). The client is a fetch-based
// stream (NOT EventSource) because /store/* enforces the publishable key
// via header, which EventSource cannot set.
//
// Protocol: `retry: 5000` hint, a `: ready` comment to flush headers, then
// `event: message\ndata: <json>\n\n` frames. A `: ping` comment every 20s
// beats Node's 300s requestTimeout and lets proxies keep the socket open.
// No Last-Event-ID replay: on reconnect the widget backfills via the
// messages endpoint, which is simpler and always consistent.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const chat = resolveChat(req)
  const token = extractToken(req as never)
  if (!token) {
    res.status(401).json({ message: "chat token is required" })
    return
  }
  const conversation = await resolveConversation(chat, { token })
  if (!conversation) {
    res.status(404).json({ message: "no chat conversation for this token" })
    return
  }

  res.status(200)
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders?.()

  res.write("retry: 5000\n\n")
  res.write(`: ready ${conversation.id}\n\n`)

  const unsubscribe = await chat.subscribeMessages((event) => {
    if (event.conversation_id !== conversation.id) {
      return
    }
    res.write(`event: message\ndata: ${JSON.stringify(event.message)}\n\n`)
  })

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n")
  }, 20_000)

  req.on("close", () => {
    clearInterval(heartbeat)
    unsubscribe()
  })
}

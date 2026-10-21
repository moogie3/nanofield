import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveChat } from "../../../../modules/chat/resolve"

// Operator presence heartbeat. The admin live-chat page (and the bell, if
// mounted) PATCHes this every 60s while visible; the store's /store/chat/status
// reads the map. Process-local — a restart clears presence until the next
// heartbeat, which is fine (worst case: "offline" for <60s).
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id
  if (!actorId) {
    res.status(401).json({ message: "Not authenticated" })
    return
  }
  await resolveChat(req).heartbeatAdmin(actorId)
  res.status(200).json({ online: true })
}

// Explicit release: fired by the admin UI on logout, unmount, and tab
// close so the storefront flips to Away immediately instead of waiting
// out the heartbeat window. Idempotent — releasing twice is a no-op.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id
  if (!actorId) {
    res.status(401).json({ message: "Not authenticated" })
    return
  }
  await resolveChat(req).releaseAdmin(actorId)
  res.status(200).json({ online: false })
}

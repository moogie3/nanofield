import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { formatIDR } from "../../admin/shopee-imports/notify"

// Customer notification bell feed. Returns channel "feed" records
// addressed to the logged-in customer (to = lowercased email) plus
// store-wide announcement broadcasts (to = "" flagged broadcast:true).
// Admin operational notes share to = "" without the flag and stay
// admin-only. Logged-out callers never reach here — the authenticate
// middleware on this route answers 401 first.
// Shape per item: { id, title, description, created_at, orderId?, link?, broadcast? }
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context?.actor_id
  if (!actorId) {
    res.status(401).json({ message: "Not authenticated" })
    return
  }

  const limit = Math.min(
    50,
    Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20)
  )
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: unknown) => Promise<{ data?: FeedRow[] }>
  }

  // Customer email is the feed key (writers lowercase it — see notifyFeed
  // callers). A missing customer row means nothing to show, not an error.
  let email = ""
  try {
    const { data: customers } = (await query.graph({
      entity: "customer",
      fields: ["id", "email"],
      filters: { id: actorId },
    })) as { data?: { id: string; email?: string | null }[] }
    email = (customers?.[0]?.email || "").toLowerCase()
  } catch {
    res.status(200).json({ notifications: [] })
    return
  }
  if (!email) {
    res.status(200).json({ notifications: [] })
    return
  }

  // Two exact-match queries instead of one $or — merged and sorted here.
  let rows: FeedRow[] = []
  try {
    const [own, broadcast] = await Promise.all([
      query.graph({
        entity: "notification",
        fields: ["id", "to", "channel", "data", "created_at"],
        filters: { to: email, channel: "feed" },
      }),
      query.graph({
        entity: "notification",
        fields: ["id", "to", "channel", "data", "created_at"],
        filters: { to: "", channel: "feed" },
      }),
    ])
    rows = [
      ...(own.data ?? []),
      ...((broadcast.data ?? []).filter((n) => n?.data?.broadcast)),
    ]
      .filter((n) => n?.id && n.created_at)
      .sort((a, b) => (a.created_at! < b.created_at! ? 1 : -1))
  } catch {
    res.status(200).json({ notifications: [] })
    return
  }

  res.status(200).json({
    notifications: rows.slice(offset, offset + limit).map(toPayload),
    total: rows.length,
  })
}

type FeedRow = {
  id: string
  to?: string
  created_at?: string
  data?: {
    title?: string
    description?: string
    orderId?: string
    link?: string
    broadcast?: boolean
  }
}

const toPayload = (n: FeedRow) => ({
  id: n.id,
  title: n.data?.title || "New notification",
  description: normalizeLegacyAmounts(n.data?.description || ""),
  created_at: n.created_at,
  ...(n.data?.orderId ? { orderId: n.data.orderId } : {}),
  ...(n.data?.link ? { link: n.data.link } : {}),
  ...(n.data?.broadcast ? { broadcast: true } : {}),
})

// Oldest feed rows (written before formatIDR) embed raw BigNumber totals
// like "Total 19000.0000000000000000 IDR". History rows are immutable, so
// normalize at read time: dotted-decimal + IDR suffix becomes Rp formatting.
const normalizeLegacyAmounts = (text: string): string =>
  text.replace(/(\d+\.\d+)\s+IDR/g, (_, amount: string) => formatIDR(amount))

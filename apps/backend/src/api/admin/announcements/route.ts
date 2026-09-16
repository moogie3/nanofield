import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyFeed } from "../shopee-imports/notify"

// Store-wide announcements for the customer navbar bell. A broadcast is a
// channel "feed" record with to = "" flagged broadcast:true — the store
// route already serves those rows to every logged-in customer, so posting
// here is the entire send path. No targeting, no scheduling, no delete
// (a posted announcement is history; post a correction instead).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = Math.min(
    50,
    Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20)
  )
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: unknown) => Promise<{ data?: BroadcastRow[] }>
  }
  try {
    const { data } = await query.graph({
      entity: "notification",
      fields: ["id", "to", "channel", "data", "created_at"],
      filters: { to: "", channel: "feed" },
    })
    // Broadcasts only — admin bell notes share to = "" without the flag.
    const rows = (data ?? [])
      .filter((n) => n?.id && n.created_at && n.data?.broadcast)
      .sort((a, b) => (a.created_at! < b.created_at! ? 1 : -1))
      .slice(0, limit)
    res.status(200).json({ announcements: rows.map(toPayload) })
  } catch {
    res.status(200).json({ announcements: [] })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as Record<string, unknown>
  const title = String(body.title ?? "").trim().slice(0, 120)
  const description = String(body.description ?? "").trim().slice(0, 500)
  const link = String(body.link ?? "").trim().slice(0, 200)
  if (!title) {
    res.status(400).json({ message: "Title is required." })
    return
  }
  // Links stay inside the storefront (relative paths only) — the bell
  // renders them as internal navigation, never raw external hrefs.
  if (link && !link.startsWith("/")) {
    res.status(400).json({ message: "Link must be a storefront path starting with /." })
    return
  }
  await notifyFeed(req.scope, {
    to: "",
    title,
    ...(description ? { description } : {}),
    data: {
      broadcast: true,
      ...(link ? { link } : {}),
    },
  })
  res.status(201).json({ ok: true })
}

type BroadcastRow = {
  id: string
  created_at?: string
  data?: {
    title?: string
    description?: string
    link?: string
    broadcast?: boolean
  }
}

const toPayload = (n: BroadcastRow) => ({
  id: n.id,
  title: n.data?.title || "Announcement",
  description: n.data?.description || "",
  created_at: n.created_at,
  ...(n.data?.link ? { link: n.data.link } : {}),
})

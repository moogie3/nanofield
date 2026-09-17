import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

// Broadcast bell records are scoped to to = "" feed rows by both handlers
// below — customer-addressed history (order updates keyed by email) can
// never be edited or removed from here.
const loadBroadcast = async (
  req: MedusaRequest,
  id: string
): Promise<{ id: string; data?: Record<string, unknown> }> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: unknown) => Promise<{ data?: { id: string; to?: string; channel?: string; data?: Record<string, unknown> }[] }>
  }
  const { data } = await query.graph({
    entity: "notification",
    fields: ["id", "to", "channel", "data"],
    filters: { id },
  })
  const row = data?.[0]
  if (!row || row.to !== "" || row.channel !== "feed") {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `no broadcast announcement with id ${id}`
    )
  }
  return row
}

// Edits a past broadcast's copy in place. What customers already saw stays
// seen (read state is per-device); the new copy applies going forward to
// the bell, history page, and anyone who hasn't opened it yet.
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id || "")
  const row = await loadBroadcast(req, id)
  const body = (req.body || {}) as Record<string, unknown>
  const title = String(body.title ?? "").trim().slice(0, 120)
  if (!title) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "title is required")
  }
  const description = String(body.description ?? "").trim().slice(0, 500)
  const link = String(body.link ?? "").trim().slice(0, 200)
  if (link && !link.startsWith("/")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "link must be a storefront path starting with /"
    )
  }
  const notificationModule = req.scope.resolve(Modules.NOTIFICATION) as {
    updateNotifications: (
      data: Record<string, unknown>
    ) => Promise<unknown>
  }
  const [updated] = (await notificationModule.updateNotifications({
    id,
    data: {
      ...(row.data || {}),
      title,
      description,
      ...(link ? { link } : { link: "" }),
    },
  })) as unknown as { data?: { title?: string; description?: string } }[]
  void updated
  res.status(200).json({ ok: true, id })
}

// Deletes one broadcast bell record by id. Deleting the bell record does
// not touch a banner twin created from the same copy (separate Banner row,
// managed in the Banners section).
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id || "")
  await loadBroadcast(req, id)
  const notificationModule = req.scope.resolve(Modules.NOTIFICATION) as {
    deleteNotifications: (ids: string[]) => Promise<void>
  }
  await notificationModule.deleteNotifications([id])
  res.status(200).json({ deleted: id })
}

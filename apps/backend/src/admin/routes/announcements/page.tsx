import { useCallback, useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BellAlert } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  Textarea,
} from "@medusajs/ui"

// Store-wide announcements for the customer navbar bell. Posting writes one
// broadcast feed record (to = "") that every logged-in customer picks up on
// the next 60s poll — and that also lands in the admin bell, so operators
// see exactly what customers see. No targeting, no scheduling, no delete:
// a posted announcement is history; post a correction instead.
type Announcement = {
  id: string
  title: string
  description: string
  link?: string
  created_at?: string
}

const RouteIcon = () => {
  return <BellAlert />
}

const emptyForm = { title: "", description: "", link: "" }

const AnnouncementsPage = () => {
  const [rows, setRows] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch("/admin/announcements")
      const data = (await r.json()) as {
        announcements?: Announcement[]
        message?: string
      }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      setRows(data.announcements || [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const formValid = form.title.trim().length > 0 && !saving

  const broadcast = async () => {
    const link = form.link.trim()
    if (link && !link.startsWith("/")) {
      setError("Link must be a storefront path starting with /.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const r = await fetch("/admin/announcements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          ...(link ? { link } : {}),
        }),
      })
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      setForm(emptyForm)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Container>
        <Heading level="h1">Announcements</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          Broadcast to every logged-in customer&apos;s navbar bell. Appears
          within a minute; also shows in the admin bell. There is no delete —
          double-check before broadcasting.
        </Text>
        {error && (
          <Text className="mt-2 text-ui-fg-error">{error}</Text>
        )}
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-title">Title (required, max 120)</Label>
            <Input
              id="ann-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Weekend promo: free JNE shipping over Rp 150rb"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-description">
              Description (optional, max 500)
            </Label>
            <Textarea
              id="ann-description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Valid Saturday–Sunday on all JNE REG orders, no code needed."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-link">
              Link (optional, storefront path)
            </Label>
            <Input
              id="ann-link"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="/store"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={() => void broadcast()} disabled={!formValid}>
            Broadcast
          </Button>
        </div>
      </Container>
      <Container>
        <Heading level="h2">Past broadcasts</Heading>
        {loading ? (
          <Text className="mt-2 text-ui-fg-subtle">Loading…</Text>
        ) : rows.length === 0 ? (
          <Text className="mt-2 text-ui-fg-subtle">
            Nothing broadcast yet.
          </Text>
        ) : (
          <ul className="mt-2 flex flex-col">
            {rows.map((a) => (
              <li
                key={a.id}
                className="border-t border-ui-border-base py-3 first:border-t-0"
              >
                <Text weight="plus">{a.title}</Text>
                {!!a.description && (
                  <Text className="text-ui-fg-subtle">{a.description}</Text>
                )}
                <Text className="text-ui-fg-subtle">
                  {[a.link, formatDate(a.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  )
}

const formatDate = (iso?: string): string => {
  if (!iso) {
    return ""
  }
  const t = new Date(iso)
  if (!Number.isFinite(t.getTime())) {
    return ""
  }
  return t.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export const config = defineRouteConfig({
  label: "Announcements",
  icon: RouteIcon,
})

export default AnnouncementsPage

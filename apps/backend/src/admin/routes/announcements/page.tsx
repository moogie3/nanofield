import { useCallback, useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BellAlert } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"

// Store-wide announcements (customer navbar bell) + storefront banners
// (homepage + store page, announcement strip above image banner).
// Broadcasts write one feed record (to = "") picked up on the next 60s
// poll — they also land in the admin bell, so operators see what customers
// see. Banners are Banner-module rows: published + within dates = live.
// Nothing is ever deleted: unpublish flips is_published, expired rows stay
// as history. Post a correction instead of editing a live broadcast.
type Announcement = {
  id: string
  title: string
  description: string
  link?: string
  created_at?: string
}

type Banner = {
  id: string
  type: string
  title: string
  description: string
  link: string
  image_url: string
  ends_at: string | null
  is_published: boolean
  created_at?: string
}

const RouteIcon = () => {
  return <BellAlert />
}

const emptyForm = { title: "", description: "", link: "", bannerUntil: "" }
const emptyImage = { title: "", link: "", endsAt: "" }

// Date input (YYYY-MM-DD) means "shown through this date" — end of day.
const endOfDay = (date: string): string => `${date}T23:59:59`

const AnnouncementsPage = () => {
  const prompt = usePrompt()
  const [rows, setRows] = useState<Announcement[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [image, setImage] = useState(emptyImage)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [strip, setStrip] = useState({ title: "", description: "", link: "", endsAt: "" })
  const [stripSaving, setStripSaving] = useState(false)

  // The two sections load independently: a banners failure (e.g. backend
  // booted without the new migration) must not blank the broadcasts, and
  // each section names its own failure.
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setBannerError(null)
    const loadAnnouncements = (async () => {
      const a = await fetch("/admin/announcements")
      const aData = (await a.json()) as {
        announcements?: Announcement[]
        message?: string
      }
      if (!a.ok) {
        throw new Error(aData.message || a.statusText)
      }
      setRows(aData.announcements || [])
    })().catch((e) => setError((e as Error).message))
    const loadBanners = (async () => {
      const b = await fetch("/admin/banners")
      const bData = (await b.json()) as {
        banners?: Banner[]
        message?: string
      }
      if (!b.ok) {
        throw new Error(bData.message || b.statusText)
      }
      setBanners(bData.banners || [])
    })().catch((e) => setBannerError((e as Error).message))
    await Promise.all([loadAnnouncements, loadBanners])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const checkLink = (link: string): boolean => {
    if (link && !link.startsWith("/")) {
      setError("Link must be a storefront path starting with /.")
      return false
    }
    return true
  }

  const formValid = form.title.trim().length > 0 && !saving

  const broadcast = async () => {
    const link = form.link.trim()
    if (!checkLink(link)) {
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
      // Optional banner twin: same copy as a homepage/store strip until
      // the chosen date. Bell broadcast and banner are separate records —
      // unpublishing the banner never touches the bell history.
      if (form.bannerUntil) {
        const br = await fetch("/admin/banners", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: "announcement",
            title: form.title.trim(),
            description: form.description.trim(),
            ...(link ? { link } : {}),
            ends_at: endOfDay(form.bannerUntil),
          }),
        })
        const brData = (await br.json()) as { message?: string }
        if (!br.ok) {
          throw new Error(brData.message || br.statusText)
        }
      }
      setForm(emptyForm)
      await load()
      toast.success("Broadcast sent to the customer bell", {
        description: form.bannerUntil
          ? "Banner twin runs as the homepage/store strip through the chosen date."
          : "Customers pick it up on the next bell poll.",
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const imageValid =
    image.title.trim().length > 0 && imageFile !== null && !uploading

  // Standalone announcement strip: same surface as the broadcast "banner
  // until" twin, without touching the bell. Covers strips for older
  // broadcasts and one-off strips that were never bell announcements.
  const stripValid = strip.title.trim().length > 0 && !stripSaving

  const createStrip = async () => {
    const link = strip.link.trim()
    if (!checkLink(link)) {
      return
    }
    setStripSaving(true)
    setError(null)
    try {
      const r = await fetch("/admin/banners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "announcement",
          title: strip.title.trim(),
          description: strip.description.trim(),
          ...(link ? { link } : {}),
          ...(strip.endsAt ? { ends_at: endOfDay(strip.endsAt) } : {}),
        }),
      })
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      await load()
      toast.success("Announcement strip published", {
        description: "Live above the image banner within a minute.",
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setStripSaving(false)
    }
  }

  const uploadImageBanner = async () => {
    const link = image.link.trim()
    if (!checkLink(link)) {
      return
    }
    if (!imageFile) {
      setError("Choose an image file first.")
      return
    }
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("type", "image")
      fd.append("title", image.title.trim())
      if (link) {
        fd.append("link", link)
      }
      if (image.endsAt) {
        fd.append("ends_at", endOfDay(image.endsAt))
      }
      fd.append("image", imageFile)
      const r = await fetch("/admin/banners", { method: "POST", body: fd })
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      setImage(emptyImage)
      setImageFile(null)
      await load()
      toast.success("Image banner published", {
        description: "Live on the homepage and store page within a minute.",
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }
  const deleteImageBanner = async (id: string, title: string) => {
    const confirmed = await prompt({
      title: "Remove slide from carousel?",
      description: `"${title}" will be permanently deleted and removed from the storefront carousel. This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!confirmed) {
      return
    }
    setError(null)
    try {
      const r = await fetch(`/admin/banners/${id}`, { method: "DELETE" })
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      await load()
      toast.success("Image removed from carousel")
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const togglePublish = async (b: Banner) => {
    setError(null)
    try {
      const r = await fetch(`/admin/banners/${b.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_published: !b.is_published }),
      })
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      await load()
      toast.success(
        b.is_published ? "Banner unpublished" : "Banner published",
        {
          description: b.is_published
            ? "Hidden from the storefront immediately."
            : "Live on the homepage and store page within a minute.",
        }
      )
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Deletes the bell record only. A banner twin (same copy running as a
  // homepage/store strip) is a separate Banner row — unpublish it in the
  // Banners section if it exists.
  const removeBroadcast = async (id: string, title: string) => {
    const confirmed = await prompt({
      title: "Delete broadcast?",
      description: `"${title}" will be permanently deleted from the bell history. This cannot be undone. If a banner twin exists, unpublish it separately in the Announcement strips section.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!confirmed) {
      return
    }
    setError(null)
    try {
      const r = await fetch(`/admin/announcements/${id}`, { method: "DELETE" })
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      await load()
      toast.success("Broadcast deleted")
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const reannounceBroadcast = async (a: Announcement) => {
    const confirmed = await prompt({
      title: "Reannounce broadcast?",
      description: `This will send "${a.title}" to everyone's notification bell again as a new message.`,
      confirmText: "Reannounce",
      cancelText: "Cancel",
    })
    if (!confirmed) {
      return
    }
    setError(null)
    try {
      const r = await fetch("/admin/announcements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: a.title,
          description: a.description || "",
          ...(a.link ? { link: a.link } : {}),
        }),
      })
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      await load()
      toast.success("Broadcast reannounced", {
        description: "Customers will pick it up on their next bell poll.",
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Inline edit of a past broadcast's copy. Applies going forward only —
  // customers who already opened it keep their read state.
  const [editing, setEditing] = useState<{
    id: string
    title: string
    description: string
    link: string
  } | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const saveEdit = async () => {
    if (!editing || !editing.title.trim() || editSaving) {
      return
    }
    if (editing.link && !editing.link.startsWith("/")) {
      setError("Link must be a storefront path starting with /.")
      return
    }
    setEditSaving(true)
    setError(null)
    try {
      const r = await fetch(`/admin/announcements/${editing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editing.title.trim(),
          description: editing.description.trim(),
          link: editing.link.trim(),
        }),
      })
      const data = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(data.message || r.statusText)
      }
      setEditing(null)
      await load()
      toast.success("Broadcast updated", {
        description: "New copy applies going forward.",
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Container>
        <Heading level="h1">User Notifications (Bell)</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          Broadcast a persistent message to the notification inbox of every logged-in customer. Appears
          within a minute. Use this for low-urgency or persistent updates (e.g., "Welcome", "New category added"). 
          For transient, unmissable alerts that guests must see, use the <strong>Global Announcement Strip</strong> below instead.
        </Text>
        {error && <Text className="mt-2 text-ui-fg-error">{error}</Text>}
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ann-banner-until">
                Also banner until (optional)
              </Label>
              <Input
                id="ann-banner-until"
                type="date"
                value={form.bannerUntil}
                onChange={(e) =>
                  setForm({ ...form, bannerUntil: e.target.value })
                }
              />
            </div>
          </div>
          <Text className="text-ui-fg-subtle">
            With a banner date, the same copy also runs as the homepage/store
            strip through that date — dismissible by customers, removable here
            without touching bell history.
          </Text>
        </div>
        <div className="mt-3">
          <Button onClick={() => void broadcast()} disabled={!formValid}>
            Broadcast
          </Button>
        </div>
      </Container>
      <Container>
        <Heading level="h2">Image Banner Carousel</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          Each uploaded image becomes one slide in the homepage carousel.
          Published images appear in newest-first order — add more to grow the
          carousel, unpublish or delete to remove a slide. JPEG/PNG/WebP under
          5MB. The carousel displays all slides at a fixed <strong>3:1 aspect ratio</strong>{" "}
          (e.g. 1500&times;500 px) — images are cropped to fit, so upload
          landscape images close to that ratio for best results.
        </Text>

        {/* Live carousel slides */}
        {banners.filter((b) => b.type === "image").length > 0 && (
          <div className="mt-4">
            <Text weight="plus" className="text-small-plus mb-2">
              Current slides ({banners.filter((b) => b.type === "image" && b.is_published).length} published
              {banners.filter((b) => b.type === "image" && !b.is_published).length > 0
                ? `, ${banners.filter((b) => b.type === "image" && !b.is_published).length} unpublished`
                : ""})
            </Text>
            <ul className="flex flex-col gap-3">
              {banners
                .filter((b) => b.type === "image")
                .map((b, i) => (
                  <li
                    key={b.id}
                    className="flex items-start gap-3 rounded-xl border border-ui-border-base p-3"
                  >
                    {b.image_url && (
                      <img
                        src={b.image_url}
                        alt={b.title}
                        className="h-16 w-48 shrink-0 rounded-lg border border-ui-border-base object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge color={b.is_published ? "green" : "grey"}>
                          {b.is_published ? `Slide ${i + 1}` : "unpublished"}
                        </Badge>
                        <Text weight="plus" className="truncate">{b.title}</Text>
                      </div>
                      <Text className="text-small-regular text-ui-fg-subtle">
                        {[b.link, b.ends_at ? `through ${formatDate(b.ends_at)}` : "no end date"]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => void togglePublish(b)}
                      >
                        {b.is_published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void deleteImageBanner(b.id, b.title)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <Text weight="plus" className="text-small-plus">Add a new slide</Text>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="img-title">Title (required)</Label>
              <Input
                id="img-title"
                value={image.title}
                onChange={(e) => setImage({ ...image, title: e.target.value })}
                placeholder="NewComplex Module Series"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="img-link">Link (optional, storefront path)</Label>
              <Input
                id="img-link"
                value={image.link}
                onChange={(e) => setImage({ ...image, link: e.target.value })}
                placeholder="/store?category=modules"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="img-file">Image file</Label>
              <Input
                id="img-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="img-ends">Shown through (optional)</Label>
              <Input
                id="img-ends"
                type="date"
                value={image.endsAt}
                onChange={(e) =>
                  setImage({ ...image, endsAt: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Button
            onClick={() => void uploadImageBanner()}
            disabled={!imageValid}
          >
            Add slide
          </Button>
        </div>
      </Container>
      <Container>
        <Heading level="h2">Global Announcement Strip</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          Dismissible text strip pinned below the navbar. Visible to everyone, including guests.
          Use this for high-urgency, transient alerts (e.g., "Flash Sale", "Site Maintenance").
          Customers who click "X" will not see it again unless you click Reannounce.
        </Text>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="strip-title">Title (required, max 120)</Label>
            <Input
              id="strip-title"
              value={strip.title}
              onChange={(e) => setStrip({ ...strip, title: e.target.value })}
              placeholder="Weekend promo: free JNE shipping over Rp 150rb"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="strip-description">
              Description (optional, max 500)
            </Label>
            <Textarea
              id="strip-description"
              value={strip.description}
              onChange={(e) =>
                setStrip({ ...strip, description: e.target.value })
              }
              placeholder="Valid Saturday–Sunday on all JNE REG orders, no code needed."
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="strip-link">
                Link (optional, storefront path)
              </Label>
              <Input
                id="strip-link"
                value={strip.link}
                onChange={(e) => setStrip({ ...strip, link: e.target.value })}
                placeholder="/store"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="strip-ends">Shown through (optional)</Label>
              <Input
                id="strip-ends"
                type="date"
                value={strip.endsAt}
                onChange={(e) =>
                  setStrip({ ...strip, endsAt: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={() => void createStrip()} disabled={!stripValid}>
            Publish strip
          </Button>
        </div>
      </Container>
      <Container>
        <Heading level="h2">Live Announcement Strips</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          Live = published and within dates. Unpublish hides immediately;
          expired rows stay as history. Image banner slides are managed above.
        </Text>
        {bannerError && (
          <Text className="mt-2 text-ui-fg-error">{bannerError}</Text>
        )}
        {loading ? (
          <Text className="mt-2 text-ui-fg-subtle">Loading…</Text>
        ) : banners.filter((b) => b.type === "announcement").length === 0 ? (
          <Text className="mt-2 text-ui-fg-subtle">No announcement strips yet.</Text>
        ) : (
          <ul className="mt-2 flex flex-col">
            {banners.filter((b) => b.type === "announcement").map((b) => (
              <li
                key={b.id}
                className="border-t border-ui-border-base py-3 first:border-t-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge color={b.is_published ? "green" : "grey"}>
                      {b.is_published ? "published" : "unpublished"}
                    </Badge>
                    <Text weight="plus">{b.title}</Text>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => void togglePublish(b)}
                  >
                    {b.is_published ? "Unpublish" : "Publish"}
                  </Button>
                </div>
                <Text className="mt-1 text-ui-fg-subtle">
                  {[b.link, b.ends_at ? `through ${formatDate(b.ends_at)}` : "no end date"]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <div className="mt-2 rounded-lg border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
                  <Text weight="plus" className="text-small-plus">
                    {b.title}
                  </Text>
                  {!!b.description && (
                    <Text className="text-small-regular text-ui-fg-subtle">
                      {b.description}
                    </Text>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
      <Container>
        <Heading level="h2">Past Broadcasts</Heading>
        {loading ? (
          <Text className="mt-2 text-ui-fg-subtle">Loading…</Text>
        ) : rows.length === 0 ? (
          <Text className="mt-2 text-ui-fg-subtle">Nothing broadcast yet.</Text>
        ) : (
          <ul className="mt-2 flex flex-col">
            {rows.map((a) => (
              <li
                key={a.id}
                className="border-t border-ui-border-base py-3 first:border-t-0"
              >
                {editing?.id === a.id ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={editing.title}
                      onChange={(e) =>
                        setEditing({ ...editing, title: e.target.value })
                      }
                      placeholder="Title (required)"
                    />
                    <Textarea
                      value={editing.description}
                      onChange={(e) =>
                        setEditing({ ...editing, description: e.target.value })
                      }
                      placeholder="Description (optional)"
                    />
                    <Input
                      value={editing.link}
                      onChange={(e) =>
                        setEditing({ ...editing, link: e.target.value })
                      }
                      placeholder="Link (optional, /store…)"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => void saveEdit()}
                        disabled={!editing.title.trim() || editSaving}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <Text weight="plus">{a.title}</Text>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setEditing({
                              id: a.id,
                              title: a.title,
                              description: a.description,
                              link: a.link || "",
                            })
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => void reannounceBroadcast(a)}
                        >
                          Reannounce
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => void removeBroadcast(a.id, a.title)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    {!!a.description && (
                      <Text className="text-ui-fg-subtle">{a.description}</Text>
                    )}
                    <Text className="text-ui-fg-subtle">
                      {[a.link, formatDate(a.created_at)]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </>
                )}
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

import { useCallback, useEffect, useState } from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import {
  CONTENT_PAGE_REGISTRY,
  findRegistryPage,
  type RegistryPage,
} from "../../../modules/content/registry"
import { LOCALE_LABELS } from "./locale-labels"
import { RegistryForm } from "./registry-form"

// Pages tab of the Content route. Two kinds of pages:
//   Registry pages (returns/faq/contact) — a structured form built from
//     src/modules/content/registry.ts; the slug is locked, the free-text body
//     is replaced by the form, and saved values land in the `data` column
//     (empty fields fall back to the storefront's built-in copy).
//   Custom pages (about/terms/...) — slug + free-text body at /pages/<slug>.
// Either way a page is one (slug, locale) row; the picker creates the second
// language from the same slug.

type EditorMode = "custom" | "registry"

type PageRow = {
  id: string
  slug: string
  locale: string
  title: string
  subtitle: string
  body: string
  data: Record<string, unknown> | null
  status: string
  seo_title: string
  seo_description: string
  updated_at: number | null
}

type PageEditor = {
  id: string | null
  slug: string
  locale: string
  title: string
  subtitle: string
  body: string
  data: Record<string, unknown> | null
  status: string
  seo_title: string
  seo_description: string
}

const emptyEditor = (locale: string): PageEditor => ({
  id: null,
  slug: "",
  locale,
  title: "",
  subtitle: "",
  body: "",
  data: null,
  status: "published",
  seo_title: "",
  seo_description: "",
})

const toEditor = (p: PageRow): PageEditor => ({
  id: p.id,
  slug: p.slug,
  locale: p.locale,
  title: p.title,
  subtitle: p.subtitle,
  body: p.body,
  data: p.data,
  status: p.status,
  seo_title: p.seo_title,
  seo_description: p.seo_description,
})

export const PagesPanel = () => {
  const prompt = usePrompt()
  const [rows, setRows] = useState<PageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<PageEditor | null>(null)
  const [mode, setMode] = useState<EditorMode>("custom")
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch("/admin/content/pages")
      const payload = (await r.json()) as {
        pages?: PageRow[]
        message?: string
      }
      if (!r.ok) {
        throw new Error(payload.message || r.statusText)
      }
      setRows(payload.pages || [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const registryPage =
    editor && mode === "registry" ? findRegistryPage(editor.slug) : null

  const field = <K extends keyof PageEditor>(key: K, value: PageEditor[K]) => {
    setEditor((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const openRow = (p: PageRow) => {
    setMode(findRegistryPage(p.slug) ? "registry" : "custom")
    setEditor(toEditor(p))
    setPicking(false)
    setError(null)
  }

  const openRegistry = (page: RegistryPage, locale: string) => {
    const existing = rows.find(
      (r) => r.slug === page.slug && r.locale === locale
    )
    setMode("registry")
    setEditor(
      existing ? toEditor(existing) : { ...emptyEditor(locale), slug: page.slug }
    )
    setPicking(false)
    setError(null)
  }

  const openCustom = () => {
    setMode("custom")
    setEditor(emptyEditor("id"))
    setPicking(false)
    setError(null)
  }

  // Switching language inside the editor loads that language's row when it
  // exists; when it does not, the draft stays as the starting point for a new
  // (slug, locale) row — the current row is never modified by the switch.
  const switchLocale = (next: string) => {
    if (!editor || next === editor.locale) {
      return
    }
    const existing = rows.find(
      (r) => r.slug === editor.slug && r.locale === next
    )
    setEditor(existing ? toEditor(existing) : { ...editor, locale: next, id: null })
    setError(null)
  }

  const save = async () => {
    if (!editor) {
      return
    }
    if (mode === "custom") {
      const clash = findRegistryPage(editor.slug.trim().toLowerCase())
      if (clash) {
        setError(
          `The "${clash.slug}" URL has its own form — open it from the list or New page.`
        )
        return
      }
    }
    setSaving(true)
    setError(null)
    try {
      const editing = !!editor.id
      const r = await fetch(
        editing ? `/admin/content/pages/${editor.id}` : "/admin/content/pages",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slug: editor.slug,
            locale: editor.locale,
            title: editor.title,
            subtitle: editor.subtitle,
            // Registry saves replace the body with the form's data (a legacy
            // free-text body would otherwise resurface when data is empty).
            ...(mode === "registry"
              ? { data: editor.data, body: "" }
              : { body: editor.body }),
            status: editor.status,
            seo_title: editor.seo_title,
            seo_description: editor.seo_description,
          }),
        }
      )
      const payload = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(payload.message || r.statusText)
      }
      await load()
      setEditor(null)
      toast.success(editing ? "Page updated" : "Page created", {
        description: "Live on the storefront on the next visit.",
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (p: PageRow) => {
    const next = p.status === "published" ? "draft" : "published"
    try {
      const r = await fetch(`/admin/content/pages/${p.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      const payload = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(payload.message || r.statusText)
      }
      toast.success(next === "published" ? "Page published" : "Page unpublished")
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const remove = async (p: PageRow) => {
    const confirmed = await prompt({
      title: "Delete page?",
      description: `The ${
        LOCALE_LABELS[p.locale] || p.locale
      } "${p.slug}" page will be permanently deleted. This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!confirmed) {
      return
    }
    try {
      const r = await fetch(`/admin/content/pages/${p.id}`, {
        method: "DELETE",
      })
      const payload = (await r.json()) as { message?: string }
      if (!r.ok) {
        throw new Error(payload.message || r.statusText)
      }
      toast.success("Page deleted")
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (editor) {
    return (
      <Container>
        <Heading level="h2">
          {editor.id ? "Edit page" : "New page"}
          {registryPage ? ` — ${registryPage.label}` : ""}
        </Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          {registryPage ? (
            <>
              Structured form. The storefront serves this page at{" "}
              {registryPage.path}. One row per language; a missing translation
              falls back to the default language. Save both languages as
              separate pages with the same slug.
            </>
          ) : (
            <>
              One row per language. The storefront serves the page at
              /pages/{editor.slug || "slug"} and falls back to the default
              language when a translation is missing. Save both languages as
              separate pages with the same slug.
            </>
          )}
        </Text>

        {error && <Text className="mt-2 text-ui-fg-error">{error}</Text>}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="page-slug">Slug</Label>
            <Input
              id="page-slug"
              value={editor.slug}
              placeholder="about-us"
              disabled={!!registryPage}
              onChange={(e) => field("slug", e.target.value)}
            />
            <Text className="text-ui-fg-subtle">
              {registryPage
                ? `Locked — served at ${registryPage.path}.`
                : "Lowercase letters, numbers, and hyphens."}
            </Text>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="page-locale">Language</Label>
            <Select
              value={editor.locale}
              onValueChange={(v) => switchLocale(v)}
            >
              <Select.Trigger id="page-locale">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="id">
                  {LOCALE_LABELS.id}
                </Select.Item>
                <Select.Item value="en">
                  {LOCALE_LABELS.en}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="page-title">Title</Label>
            <Input
              id="page-title"
              value={editor.title}
              maxLength={200}
              onChange={(e) => field("title", e.target.value)}
            />
            {registryPage && (
              <Text className="text-ui-fg-subtle">
                Optional — leave empty to use the storefront&apos;s built-in
                title for this language.
              </Text>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="page-status">Status</Label>
            <Select
              value={editor.status}
              onValueChange={(v) => field("status", v)}
            >
              <Select.Trigger id="page-status">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="published">Published</Select.Item>
                <Select.Item value="draft">Draft</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="page-subtitle">Subtitle</Label>
          <Input
            id="page-subtitle"
            value={editor.subtitle}
            maxLength={300}
            placeholder="Optional one-line summary under the title"
            onChange={(e) => field("subtitle", e.target.value)}
          />
        </div>

        {mode === "custom" && (
          <div className="mt-4 flex flex-col gap-1.5">
            <Label htmlFor="page-body">Body</Label>
            <Textarea
              id="page-body"
              rows={16}
              value={editor.body}
              maxLength={20000}
              className="font-mono"
              onChange={(e) => field("body", e.target.value)}
            />
            <Text className="text-ui-fg-subtle">
              Plain text. A blank line starts a new paragraph. Start a line with
              &ldquo;## &rdquo; for a section heading, &ldquo;- &rdquo; for a
              bullet, and use &ldquo;Q: &rdquo; then &ldquo;A: &rdquo; lines to
              make a question/answer card.
            </Text>
          </div>
        )}

        {mode === "registry" && editor.body && (
          <div className="mt-4 flex items-center gap-2">
            <Badge size="2xsmall" color="orange">
              legacy body
            </Badge>
            <Text size="small" className="text-ui-fg-subtle">
              Old free-text content — saving the form replaces it.
            </Text>
          </div>
        )}

        {registryPage && (
          <RegistryForm
            page={registryPage}
            data={editor.data ?? {}}
            onChange={(next) => field("data", next)}
          />
        )}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="page-seo-title">SEO title</Label>
            <Input
              id="page-seo-title"
              value={editor.seo_title}
              maxLength={200}
              placeholder="Defaults to the title"
              onChange={(e) => field("seo_title", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="page-seo-description">SEO description</Label>
            <Input
              id="page-seo-description"
              value={editor.seo_description}
              maxLength={300}
              placeholder="Defaults to the subtitle"
              onChange={(e) => field("seo_description", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button onClick={() => void save()} disabled={saving}>
            {editor.id ? "Save changes" : "Create page"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setEditor(null)
              setError(null)
            }}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </Container>
    )
  }

  if (picking) {
    return (
      <Container>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Heading level="h2">New page</Heading>
            <Text className="mt-1 text-ui-fg-subtle">
              Pages with their own structured form come first; everything else
              (about, terms, ...) is a custom page with a free-text body.
            </Text>
          </div>
          <Button variant="secondary" onClick={() => setPicking(false)}>
            Back
          </Button>
        </div>

        {error && <Text className="mt-2 text-ui-fg-error">{error}</Text>}

        <div className="mt-4 flex flex-col gap-3">
          {CONTENT_PAGE_REGISTRY.map((page) => (
            <div
              key={page.slug}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ui-border-base p-4"
            >
              <div className="flex flex-col">
                <Text weight="plus">{page.label}</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {page.path}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                {Object.keys(LOCALE_LABELS).map((code) => {
                  const existing = rows.find(
                    (r) => r.slug === page.slug && r.locale === code
                  )
                  return (
                    <Button
                      key={code}
                      size="small"
                      variant={existing ? "secondary" : "primary"}
                      onClick={() => openRegistry(page, code)}
                    >
                      {existing ? "Edit" : "Create"} · {LOCALE_LABELS[code]}
                    </Button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ui-border-base p-4">
            <div className="flex flex-col">
              <Text weight="plus">Custom page</Text>
              <Text size="small" className="text-ui-fg-subtle">
                /pages/your-slug — free-text body
              </Text>
            </div>
            <Button size="small" onClick={openCustom}>
              Create custom page
            </Button>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Heading level="h2">Pages</Heading>
          <Text className="mt-1 text-ui-fg-subtle">
            Storefront pages edited without a deploy: structured forms for
            returns, FAQ, and contact, and free-text pages such as about or
            terms. A page slug can have one variant per language; the
            storefront falls back to the default language when a translation is
            missing. Draft pages are hidden from the storefront and from search.
          </Text>
        </div>
        <Button onClick={() => setPicking(true)}>New page</Button>
      </div>

      {error && <Text className="mt-2 text-ui-fg-error">{error}</Text>}

      {loading ? (
        <Text className="mt-4 text-ui-fg-subtle">Loading…</Text>
      ) : rows.length === 0 ? (
        <Text className="mt-4 text-ui-fg-subtle">
          No pages yet. Create one to publish storefront content that you can
          edit without a deploy.
        </Text>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-ui-border-base">
          {rows.map((p) => {
            const rowPage = findRegistryPage(p.slug)
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Text weight="plus" size="small">
                      {p.title || rowPage?.label || p.slug}
                    </Text>
                    <Badge
                      size="2xsmall"
                      color={p.status === "published" ? "green" : "orange"}
                    >
                      {p.status}
                    </Badge>
                    <Badge size="2xsmall" color="grey">
                      {LOCALE_LABELS[p.locale] || p.locale}
                    </Badge>
                    {rowPage && (
                      <Badge size="2xsmall" color="blue">
                        form
                      </Badge>
                    )}
                  </div>
                  <Text className="text-ui-fg-subtle" size="small">
                    {rowPage ? rowPage.path : `/pages/${p.slug}`}
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => openRow(p)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => void toggleStatus(p)}
                  >
                    {p.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    variant="transparent"
                    size="small"
                    onClick={() => void remove(p)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Container>
  )
}

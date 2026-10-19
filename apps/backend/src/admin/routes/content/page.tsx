import { useCallback, useEffect, useMemo, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Tabs,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { LOCALE_LABELS } from "./locale-labels"
import { PagesPanel } from "./pages-panel"

// Storefront content, managed here instead of in code.
//   Settings — contact channels, hero copy, footer tagline (one value per
//     locale). The field catalog is owned by the backend
//     (src/modules/content/keys.ts) and served by GET /admin/content/settings,
//     so adding an editable field there makes it appear with no UI change.
//     Emptying a field clears the override: the storefront falls back to its
//     built-in default, and a non-default locale falls back to the default.
//   Pages (./pages-panel.tsx) — one (slug, locale) row per language.
//     Registry pages (returns/faq/contact) edit through a form built from
//     src/modules/content/registry.ts into the `data` column; custom pages
//     (about/terms/...) keep the free-text body at /pages/<slug>.

const RouteIcon = () => {
  return <DocumentText />
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

type KeyDef = {
  key: string
  label: string
  hint?: string
  maxLen: number
  multiline?: boolean
  defaults: Record<string, string>
}

type SettingsPayload = {
  catalog: KeyDef[]
  locales: string[]
  defaultLocale: string
  values: Record<string, Record<string, string>>
}

const SettingsPanel = () => {
  const [data, setData] = useState<SettingsPayload | null>(null)
  const [locale, setLocale] = useState<string>("id")
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch("/admin/content/settings")
      const payload = (await r.json()) as SettingsPayload & { message?: string }
      if (!r.ok) {
        throw new Error(payload.message || r.statusText)
      }
      setData(payload)
      setLocale((current) => {
        const next = payload.locales.includes(current)
          ? current
          : payload.defaultLocale
        setDraft(payload.values[next] || {})
        return next
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selectLocale = (next: string) => {
    setLocale(next)
    setDraft(data?.values[next] || {})
    setError(null)
  }

  const dirty = useMemo(() => {
    if (!data) {
      return false
    }
    const stored = data.values[locale] || {}
    const keys = new Set([...Object.keys(stored), ...Object.keys(draft)])
    for (const key of keys) {
      if ((stored[key] || "") !== (draft[key] || "")) {
        return true
      }
    }
    return false
  }, [data, draft, locale])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const r = await fetch("/admin/content/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, values: draft }),
      })
      const payload = (await r.json()) as {
        values?: Record<string, Record<string, string>>
        message?: string
      }
      if (!r.ok) {
        throw new Error(payload.message || r.statusText)
      }
      setData((prev) =>
        prev ? { ...prev, values: payload.values || prev.values } : prev
      )
      setDraft(payload.values?.[locale] || {})
      toast.success("Content saved", {
        description: "Live on the storefront on the next visit.",
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container>
      <Heading level="h2">Storefront Content</Heading>
      <Text className="mt-1 text-ui-fg-subtle">
        Contact channels, home hero copy, and the footer tagline. Values are
        per language. Leave a field empty to use the storefront's built-in
        default — or, for a non-default language, the default language's value.
      </Text>

      {loading ? (
        <Text className="mt-4 text-ui-fg-subtle">Loading…</Text>
      ) : !data ? (
        <Text className="mt-4 text-ui-fg-error">
          {error || "Could not load content settings."}
        </Text>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {data.locales.map((code) => {
              const active = code === locale
              return (
                <Button
                  key={code}
                  variant={active ? "primary" : "secondary"}
                  onClick={() => selectLocale(code)}
                >
                  {LOCALE_LABELS[code] || code}
                  {code === data.defaultLocale && (
                    <Badge size="2xsmall" className="ml-2">
                      default
                    </Badge>
                  )}
                </Button>
              )
            })}
          </div>

          {error && <Text className="mt-2 text-ui-fg-error">{error}</Text>}

          <div className="mt-4 flex flex-col gap-4">
            {data.catalog.map((def) => {
              const id = `content-${def.key}`
              const value = draft[def.key] || ""
              const fallback = def.defaults[locale] || ""
              const overridden = !!(data.values[locale] || {})[def.key]
              return (
                <div key={def.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={id}>{def.label}</Label>
                    {overridden ? (
                      <Badge size="2xsmall" color="green">
                        override
                      </Badge>
                    ) : (
                      <Badge size="2xsmall" color="grey">
                        default
                      </Badge>
                    )}
                  </div>
                  {def.multiline ? (
                    <Textarea
                      id={id}
                      rows={3}
                      value={value}
                      maxLength={def.maxLen}
                      placeholder={fallback}
                      onChange={(e) =>
                        setDraft({ ...draft, [def.key]: e.target.value })
                      }
                    />
                  ) : (
                    <Input
                      id={id}
                      value={value}
                      maxLength={def.maxLen}
                      placeholder={fallback}
                      onChange={(e) =>
                        setDraft({ ...draft, [def.key]: e.target.value })
                      }
                    />
                  )}
                  <Text className="text-ui-fg-subtle">
                    {def.hint ? `${def.hint} ` : ""}
                    Storefront default: &ldquo;{fallback}&rdquo;
                  </Text>
                </div>
              )
            })}
          </div>

          <div className="mt-4">
            <Button onClick={() => void save()} disabled={!dirty || saving}>
              Save
            </Button>
          </div>
        </>
      )}
    </Container>
  )
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

const ContentRoute = () => {
  return (
    <div className="flex flex-col gap-y-4">
      <Tabs defaultValue="settings">
        <Tabs.List>
          <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
          <Tabs.Trigger value="pages">Pages</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="settings" className="mt-4">
          <SettingsPanel />
        </Tabs.Content>
        <Tabs.Content value="pages" className="mt-4">
          <PagesPanel />
        </Tabs.Content>
      </Tabs>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Content",
  icon: RouteIcon,
})

export default ContentRoute

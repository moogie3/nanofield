import { useCallback, useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
} from "@medusajs/ui"

// Owner-only activity log: every admin mutation (POST/PATCH/PUT/DELETE on
// /admin/*, no bodies, no GETs) with actor, path, and status. Staff roles
// without audit-log:read get 403 and see the restricted card instead — the
// API enforces, this page only renders the outcome. Retention is bounded by
// the audit-retention job (AUDIT_RETENTION_DAYS, default 90).
type AuditEntry = {
  id: string
  actor_id: string
  actor_email?: string | null
  method: string
  path: string
  status: number
  created_at?: string
}

const PAGE_SIZE = 50

const methodColor = (method: string) => {
  switch (method) {
    case "DELETE":
      return "red"
    case "POST":
      return "green"
    case "PUT":
    case "PATCH":
      return "blue"
    default:
      return "grey"
  }
}

const statusColor = (status: number) =>
  status >= 500 ? "red" : status >= 400 ? "orange" : "green"

const RouteIcon = () => {
  return <ShieldCheck />
}

const AuditLogPage = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState("")
  const [actor, setActor] = useState("")
  const [path, setPath] = useState("")

  const load = useCallback(
    async (nextOffset: number, reset: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(nextOffset),
        })
        if (method) {
          params.set("method", method)
        }
        if (actor.trim()) {
          params.set("actor", actor.trim())
        }
        if (path.trim()) {
          params.set("path", path.trim())
        }
        const r = await fetch(`/admin/audit-logs?${params.toString()}`)
        if (r.status === 403) {
          setForbidden(true)
          setEntries([])
          return
        }
        const data = (await r.json()) as {
          entries?: AuditEntry[]
          has_more?: boolean
          message?: string
        }
        if (!r.ok) {
          throw new Error(data.message || r.statusText)
        }
        setEntries((prev) =>
          reset ? data.entries || [] : [...prev, ...(data.entries || [])]
        )
        setHasMore(!!data.has_more)
        setOffset(nextOffset)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [method, actor, path]
  )

  useEffect(() => {
    void load(0, true)
  }, [load])

  return (
    <div className="flex flex-col gap-y-4">
      <Container>
        <Heading level="h1">Audit Log</Heading>
        <Text className="mt-1 text-ui-fg-subtle">
          Every admin change, newest first: who, what endpoint, and the
          result status. Reads and logins are not recorded; entries older
          than the retention window are deleted nightly.
        </Text>
        {forbidden ? (
          <div className="mt-4 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-6 text-center">
            <Text weight="plus">Restricted to the Owner role</Text>
            <Text className="mt-1 text-ui-fg-subtle">
              Your staff account does not have audit-log access. Ask the
              owner to review activity with you.
            </Text>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="audit-method">Method</Label>
                <Select
                  value={method || "ALL"}
                  onValueChange={(v) => setMethod(v === "ALL" ? "" : v)}
                >
                  <Select.Trigger id="audit-method">
                    <Select.Value placeholder="All methods" />
                  </Select.Trigger>
                  <Select.Content>
                    {["ALL", "POST", "PATCH", "PUT", "DELETE"].map((m) => (
                      <Select.Item key={m} value={m}>
                        {m === "ALL" ? "All methods" : m}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="audit-actor">Actor (id or email)</Label>
                <Input
                  id="audit-actor"
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  placeholder="admin@…"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="audit-path">Endpoint contains</Label>
                <Input
                  id="audit-path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/admin/products"
                />
              </div>
            </div>
            {error && (
              <Text className="mt-2 text-ui-fg-error">{error}</Text>
            )}
            {loading && entries.length === 0 ? (
              <Text className="mt-4 text-ui-fg-subtle">Loading…</Text>
            ) : entries.length === 0 ? (
              <Text className="mt-4 text-ui-fg-subtle">
                No recorded changes yet. Mutations appear here within seconds.
              </Text>
            ) : (
              <ul className="mt-2 flex flex-col">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className="border-t border-ui-border-base py-3 first:border-t-0"
                  >
                    <div className="flex items-center gap-2">
                      <Badge color={methodColor(e.method)}>{e.method}</Badge>
                      <Badge color={statusColor(e.status)}>{e.status}</Badge>
                      <Text weight="plus" className="truncate font-mono text-small-plus">
                        {e.path}
                      </Text>
                    </div>
                    <Text className="mt-1 text-ui-fg-subtle">
                      {[
                        e.actor_email || e.actor_id,
                        e.created_at
                          ? new Date(e.created_at).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </li>
                ))}
              </ul>
            )}
            {hasMore && (
              <div className="mt-3">
                <Button
                  variant="secondary"
                  onClick={() => void load(offset + PAGE_SIZE, false)}
                  disabled={loading}
                >
                  Show more
                </Button>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Audit Log",
  icon: RouteIcon,
})

export default AuditLogPage

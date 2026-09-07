import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Drawer,
  Heading,
  Input,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { sdk } from "../lib/sdk"

type BulkAction = "set-stock" | "delete"

type ListedProduct = {
  id: string
  title: string
  handle: string
  status: string
  variants?: { id: string; sku: string | null }[]
}

type PreviewRow = {
  sku: string
  found: boolean
  productTitle?: string
  status?: string
  currentStock?: number
}

type ExecuteReport = {
  action: BulkAction
  processed: number
  stockSet?: number
  deletedProducts?: number
  deletedSkus?: number
  unmatched: string[]
  errors: string[]
}

const skusOf = (p: ListedProduct): string[] =>
  (p.variants || [])
    .map((v) => v.sku || "")
    .filter((s) => s.length > 0)

// POST JSON to our bulk API with structured errors: HTTP status + server
// message for API failures (400 validation, 404 route, 500 engine),
// plain network message when the backend is unreachable.
const apiPost = async <T,>(path: string, body: unknown): Promise<T> => {
  let r: Response
  try {
    r = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error("Network error — is the Medusa backend running?")
  }
  let data: (T & { message?: string }) | null = null
  try {
    data = (await r.json()) as T & { message?: string }
  } catch {
    // non-JSON error page (proxy/restart); fall through to status text
  }
  if (!r.ok) {
    throw new Error(
      `${r.status} ${r.statusText}${
        data?.message ? ` — ${data.message}` : ""
      }`.trim()
    )
  }
  return data as T
}

const BulkDrawer = ({
  action,
  open,
  onOpenChange,
}: {
  action: BulkAction
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const prompt = usePrompt()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ListedProduct[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [searching, setSearching] = useState(false)
  const [selectingAll, setSelectingAll] = useState(false)
  const [selected, setSelected] = useState<Record<string, ListedProduct>>({})
  const [qty, setQty] = useState("0")
  // Per-SKU quantities for set-stock: initialized from the global qty at
  // preview time, then editable per row. Delete ignores quantities.
  const [rowQty, setRowQty] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fresh state every time the drawer opens.
  useEffect(() => {
    if (open) {
      setQuery("")
      setResults([])
      setTotalCount(0)
      setSelected({})
      setRowQty({})
      setPreview(null)
      setError(null)
    }
  }, [open ])

  // Loads immediately on open (unfiltered first page) and re-queries while
  // typing (debounced), so the list is never an empty box waiting for input.
  // Pages of 50 with an explicit Load more — the full result set (e.g. all
  // 1200 loadtest rows) is browsable, not just the first 10.
  const SEARCH_PAGE = 50

  useEffect(() => {
    if (!open) {
      return
    }
    const q = query.trim()
    setSearching(true)
    const run = async () => {
      try {
        const data = (await sdk.admin.product.list({
          ...(q ? { q } : {}),
          limit: SEARCH_PAGE,
          fields: "id,title,handle,status,*variants",
        })) as unknown as { products: ListedProduct[]; count: number }
        setResults(data.products || [])
        setTotalCount(data.count || 0)
      } catch {
        setResults([])
        setTotalCount(0)
      } finally {
        setSearching(false)
      }
    }
    if (!q) {
      void run()
      return
    }
    const timer = setTimeout(() => void run(), 400)
    return () => clearTimeout(timer)
  }, [query, open])

  const loadMore = async () => {
    const q = query.trim()
    setSearching(true)
    try {
      const data = (await sdk.admin.product.list({
        ...(q ? { q } : {}),
        limit: SEARCH_PAGE,
        offset: results.length,
        fields: "id,title,handle,status,*variants",
      })) as unknown as { products: ListedProduct[]; count: number }
      const rows = data.products || []
      setResults((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...rows.filter((p) => !seen.has(p.id))]
      })
      setTotalCount(data.count || 0)
    } catch (e) {
      const message = (e as Error).message
      setError(message)
      toast.error("Load more failed", { description: message })
    } finally {
      setSearching(false)
    }
  }

  const toggle = (p: ListedProduct) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[p.id]) {
        delete next[p.id]
      } else {
        next[p.id] = p
      }
      return next
    })
  }

  const selectedSkus = Object.values(selected).flatMap(skusOf)
  const selectedCount = Object.keys(selected).length
  const allLoadedSelected =
    results.length > 0 && results.every((r) => selected[r.id])

  const toggleAllLoaded = () => {
    setSelected((prev) => {
      if (allLoadedSelected) {
        const next = { ...prev }
        for (const r of results) {
          delete next[r.id]
        }
        return next
      }
      const next = { ...prev }
      for (const r of results) {
        next[r.id] = r
      }
      return next
    })
  }

  // Select every product matching the current search, across all pages.
  // Empty search means the whole catalog. Capped: beyond 3000 the user
  // must narrow the query first.
  const selectAllMatching = async () => {
    const q = query.trim()
    if (totalCount > 3000) {
      const message = `Too many matches (${totalCount}) — narrow the search first (max 3000).`
      setError(message)
      toast.error("Select all refused", { description: message })
      return
    }
    setSelectingAll(true)
    setError(null)
    try {
      const all: ListedProduct[] = []
      let offset = 0
      for (;;) {
        const data = (await sdk.admin.product.list({
          ...(q ? { q } : {}),
          limit: 100,
          offset,
          fields: "id,title,handle,status,*variants",
        })) as unknown as { products: ListedProduct[] }
        const rows = data.products || []
        all.push(...rows)
        if (rows.length < 100 || all.length >= 3000) {
          break
        }
        offset += 100
      }
      setSelected((prev) => {
        const next = { ...prev }
        for (const p of all) {
          next[p.id] = p
        }
        return next
      })
      toast.success(`Selected ${all.length} product(s)`, {
        description: "Review with Preview before applying.",
      })
    } catch (e) {
      const message = (e as Error).message
      setError(message)
      toast.error("Select all failed", { description: message })
    } finally {
      setSelectingAll(false)
    }
  }

  // Large selections are split into small POSTs: a single multi-thousand
  // SKU body trips the API payload limit (413). Chunks run sequentially
  // with progress text; results merge into one preview/report.
  const PREVIEW_CHUNK = 800
  const EXECUTE_CHUNK = 400

  const runPreview = async () => {
    if (selectedSkus.length === 0) {
      setError("Tick at least one product with a SKU first.")
      return
    }
    if (action === "set-stock") {
      const quantity = Number(qty)
      if (!Number.isInteger(quantity) || quantity < 0) {
        setError("Default quantity needs a whole number >= 0.")
        return
      }
    }
    setBusy(true)
    setError(null)
    setPreview(null)
    try {
      const skus = selectedSkus
      const allRows: PreviewRow[] = []
      for (let i = 0; i < skus.length; i += PREVIEW_CHUNK) {
        setProgress(
          skus.length > PREVIEW_CHUNK
            ? `Previewing ${Math.min(i + PREVIEW_CHUNK, skus.length)} of ${skus.length}…`
            : null
        )
        const data = await apiPost<{ rows: PreviewRow[] }>(
          "/admin/bulk-products/preview",
          { items: skus.slice(i, i + PREVIEW_CHUNK).map((sku) => ({ sku })) }
        )
        allRows.push(...data.rows)
      }
      setPreview(allRows)
      if (action === "set-stock") {
        // Seed every row with the global qty; rows stay individually
        // editable afterwards (see preview list below).
        const seeded: Record<string, string> = {}
        for (const r of allRows) {
          seeded[r.sku] = qty
        }
        setRowQty(seeded)
      }
    } catch (e) {
      const message = (e as Error).message
      setError(message)
      toast.error("Preview failed", { description: message })
    } finally {
      setProgress(null)
      setBusy(false)
    }
  }

  const runExecute = async () => {
    // Set-stock applies each preview row's own quantity (editable below);
    // delete applies to every selected SKU.
    let execItems: { sku: string; quantity?: number }[]
    if (action === "set-stock") {
      if (!preview) {
        setError("Preview first, then adjust per-row quantities.")
        return
      }
      const bad = preview
        .filter((r) => r.found)
        .find((r) => {
          const n = Number(rowQty[r.sku])
          return !Number.isInteger(n) || n < 0
        })
      if (bad) {
        setError(`Quantity for ${bad.sku} needs a whole number >= 0.`)
        return
      }
      execItems = preview
        .filter((r) => r.found)
        .map((r) => ({ sku: r.sku, quantity: Number(rowQty[r.sku]) }))
      if (execItems.length === 0) {
        setError("No matched rows to apply.")
        return
      }
    } else {
      execItems = selectedSkus.map((sku) => ({ sku }))
    }
    if (action === "delete") {
      const confirmed = await prompt({
        title: `Delete ${matched.length} product(s)?`,
        description:
          "Matched products are permanently deleted. SKUs sharing a product delete it together. This cannot be undone.",
        confirmText: "Delete forever",
        cancelText: "Keep",
      })
      if (!confirmed) {
        return
      }
    }
    setBusy(true)
    setError(null)
    try {
      const skus = selectedSkus
      const merged: ExecuteReport = {
        action,
        processed: 0,
        unmatched: [],
        errors: [],
      }
      if (action === "set-stock") {
        merged.stockSet = 0
      } else {
        merged.deletedProducts = 0
        merged.deletedSkus = 0
      }
      for (let i = 0; i < execItems.length; i += EXECUTE_CHUNK) {
        setProgress(
          execItems.length > EXECUTE_CHUNK
            ? `Applying ${Math.min(i + EXECUTE_CHUNK, execItems.length)} of ${execItems.length}…`
            : null
        )
        const data = await apiPost<{ report: ExecuteReport }>(
          "/admin/bulk-products/execute",
          {
            action,
            items: execItems.slice(i, i + EXECUTE_CHUNK),
          }
        )
        const r = data.report
        merged.processed += r.processed
        merged.unmatched.push(...r.unmatched)
        merged.errors.push(...r.errors)
        merged.stockSet = (merged.stockSet || 0) + (r.stockSet || 0)
        merged.deletedProducts =
          (merged.deletedProducts || 0) + (r.deletedProducts || 0)
        merged.deletedSkus = (merged.deletedSkus || 0) + (r.deletedSkus || 0)
      }
      const report = merged
      if (action === "set-stock") {
        toast.success("Stock updated", {
          description: `${report.stockSet} SKU(s) set · ${report.unmatched.length} unmatched · ${report.errors.length} errors`,
        })
      } else {
        toast.success("Products deleted", {
          description: `${report.deletedProducts} product(s) deleted · ${report.unmatched.length} unmatched · ${report.errors.length} errors`,
        })
      }
      if (report.errors.length > 0) {
        setError(report.errors.slice(0, 5).join("\n"))
      }
      setSelected({})
      setPreview(null)
      onOpenChange(false)
    } catch (e) {
      const message = (e as Error).message
      setError(message)
      toast.error(
        action === "delete" ? "Delete failed" : "Stock update failed",
        { description: message }
      )
    } finally {
      setProgress(null)
      setBusy(false)
    }
  }

  const matched = preview?.filter((r) => r.found) || []
  const unmatched = preview?.filter((r) => !r.found) || []
  const isDelete = action === "delete"

  return (
    // Non-modal + outside-interaction guards: a modal dialog disables
    // pointer events outside itself, which made toast buttons unclickable;
    // but Radix still dismisses on outside pointerdown/focus even when
    // non-modal, so those are explicitly neutralized — otherwise clicking
    // a toast × also closes this drawer. Esc / Cancel / prompt still close.
    <Drawer open={open} onOpenChange={onOpenChange} modal={false}>
      <Drawer.Content
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <Drawer.Header>
          <Drawer.Title>
            {isDelete ? "Delete products" : "Adjust stock"}
          </Drawer.Title>
          <Drawer.Description>
            {isDelete
              ? "Search, tick, preview, then delete. Permanent — use the prompt to confirm."
              : "Search, tick, preview, then set a quantity per product and apply to the first stock location."}
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {!isDelete && (
            <div>
              <Text size="small" className="mb-1 font-medium">
                Default quantity (fills each row at preview)
              </Text>
              <Input
                type="number"
                min={0}
                step={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-32"
              />
            </div>
          )}
          <div>
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name, handle, or SKU…"
            />
            {searching && (
              <Text size="small" className="mt-1 text-ui-fg-subtle">
                Searching…
              </Text>
            )}
          </div>
          {results.length > 0 && (
            <>
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={allLoadedSelected}
                    onCheckedChange={() => toggleAllLoaded()}
                  />
                  <Text size="small" className="font-medium">
                    All on screen
                  </Text>
                </label>
                {totalCount > results.length && (
                  <Button
                    variant="transparent"
                    size="small"
                    isLoading={selectingAll}
                    disabled={selectingAll}
                    onClick={() => void selectAllMatching()}
                  >
                    Select all {totalCount} matching
                  </Button>
                )}
              </div>
              <div className="max-h-[38vh] divide-y divide-ui-border-base overflow-y-auto rounded-lg border border-ui-border-base">
                {results.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2"
                >
                  <Checkbox
                    checked={!!selected[p.id]}
                    onCheckedChange={() => toggle(p)}
                  />
                  <div className="min-w-0 flex-1">
                    <Text size="small" className="truncate font-medium">
                      {p.title}
                    </Text>
                    <Text
                      size="xsmall"
                      className="font-mono text-ui-fg-subtle"
                    >
                      {skusOf(p).join(", ") || "no SKU"}
                      {p.status ? ` · ${p.status}` : ""}
                    </Text>
                  </div>
                </label>
              ))}
              </div>
              <div className="mt-1 flex items-center gap-3">
                <Text size="xsmall" className="text-ui-fg-subtle">
                  Showing {results.length} of {totalCount}
                </Text>
                {results.length < totalCount && (
                  <Button
                    variant="transparent"
                    size="small"
                    isLoading={searching}
                    disabled={searching}
                    onClick={() => void loadMore()}
                  >
                    Load more
                  </Button>
                )}
              </div>
            </>
          )}
          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="grey">
                {selectedCount} product(s) · {selectedSkus.length} SKU(s)
              </Badge>
              <Button
                variant="secondary"
                size="small"
                isLoading={busy}
                disabled={busy || selectedSkus.length === 0}
                onClick={() => void runPreview()}
              >
                Preview
              </Button>
              <Button
                variant="transparent"
                size="small"
                onClick={() => {
                  setSelected({})
                  setRowQty({})
                  setPreview(null)
                }}
              >
                Clear
              </Button>
            </div>
          )}
          {preview && (
            <div>
              <Text size="small" className="font-medium">
                {matched.length} matched, {unmatched.length} unmatched
                {preview.length > 200
                  ? ` — showing first 200, all ${preview.length} will apply`
                  : ""}
              </Text>
              <div className="mt-1 max-h-[30vh] divide-y divide-ui-border-base overflow-y-auto rounded-lg border border-ui-border-base">
                {preview.slice(0, 200).map((r) => (
                  <div
                    key={r.sku}
                    className="flex items-center justify-between gap-3 px-3 py-1.5"
                  >
                    <Text size="xsmall" className="font-mono">
                      {r.sku}
                      {r.currentStock !== undefined && !isDelete
                        ? ` · now ${r.currentStock}`
                        : ""}
                    </Text>
                    <div className="flex shrink-0 items-center gap-2">
                      {!isDelete && r.found && (
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={rowQty[r.sku] ?? ""}
                          onChange={(e) =>
                            setRowQty((prev) => ({
                              ...prev,
                              [r.sku]: e.target.value,
                            }))
                          }
                          className="w-20"
                          aria-label={`New stock for ${r.sku}`}
                        />
                      )}
                      <Badge color={r.found ? "green" : "red"}>
                        {r.found ? "found" : "not found"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && (
            <Text size="small" className="whitespace-pre-line text-ui-fg-error">
              {error}
            </Text>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          {progress && (
            <Text size="small" className="mr-auto text-ui-fg-subtle">
              {progress}
            </Text>
          )}
          <Drawer.Close asChild>
            <Button variant="secondary" size="small">
              Cancel
            </Button>
          </Drawer.Close>
          <Button
            variant={isDelete ? "danger" : "primary"}
            size="small"
            isLoading={busy}
            disabled={busy || !preview || matched.length === 0}
            onClick={() => void runExecute()}
          >
            {isDelete
              ? `Delete ${preview ? matched.length : "…"} row(s)`
              : `Set stock on ${preview ? matched.length : "…"} row(s)`}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

// Entry point: the two buttons prefer the table header next to Create
// (teleported there once it mounts) and fall back to an inline bar below
// the table when the header can't be found (i18n, core markup drift).
// Drawers hold everything else. The host span is removed on unmount.
const ProductBulkTools = () => {
  const [drawer, setDrawer] = useState<BulkAction | null>(null)
  const [actionsHost, setActionsHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    let host: HTMLElement | null = null
    let lastAttempt = 0
    let stopped = false
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getClientRects()
      return r.length > 0 && r[0].width > 0 && r[0].height > 0
    }
    const makeHost = () => {
      const span = document.createElement("span")
      span.setAttribute("data-nanofield-bulk-host", "true")
      span.style.display = "inline-flex"
      span.style.gap = "8px"
      span.style.alignItems = "center"
      span.style.marginRight = "8px"
      return span
    }
    // Anchors in priority order: Create / Export (insert before), then the
    // "Add filter" row (append at its right end). Core gives us no zone up
    // there, so this is best-effort DOM placement with an inline fallback.
    const attach = () => {
      try {
        const inMain = Array.from(document.querySelectorAll("main button"))
        const scope =
          inMain.length > 0
            ? inMain
            : Array.from(document.querySelectorAll("button"))
        const candidates = scope.filter((b) => visible(b))
        const text = (b: Element) => (b.textContent || "").toLowerCase()
        const anchor =
          candidates.find((b) => text(b).includes("create")) ||
          candidates.find((b) => text(b).includes("export"))
        if (
          anchor?.parentElement &&
          !anchor.parentElement.querySelector("[data-nanofield-bulk-host]")
        ) {
          host = makeHost()
          anchor.parentElement.insertBefore(host, anchor)
          setActionsHost(host)
          console.log(
            `[nanofield] bulk buttons attached next to "${text(anchor).trim()}"`
          )
          return
        }
        const filterBtn = candidates.find((b) =>
          text(b).includes("add filter")
        )
        if (
          filterBtn?.parentElement &&
          !filterBtn.parentElement.querySelector("[data-nanofield-bulk-host]")
        ) {
          host = makeHost()
          filterBtn.parentElement.appendChild(host)
          setActionsHost(host)
          console.log("[nanofield] bulk buttons attached to filter row")
          return
        }
        if (!host) {
          console.log(
            "[nanofield] bulk buttons: table header not found, using inline bar"
          )
        }
      } catch {
        // DOM not ready — the observer below retries
      }
    }
    const ensure = () => {
      if (stopped) {
        return
      }
      if (host?.isConnected) {
        return
      }
      // Host was wiped by a core re-render (pagination, filters): drop the
      // stale portal target so the inline bar returns until re-attached.
      host = null
      setActionsHost((cur) => (cur ? null : cur))
      // Tight 150ms attempts until attached: the table toolbar renders late
      // (after the products fetch), and an 800ms gate was pushing discovery
      // to 3-5s. Each attempt is one scoped querySelectorAll — negligible.
      const now = Date.now()
      if (now - lastAttempt < 150) {
        return
      }
      lastAttempt = now
      attach()
    }
    ensure()
    // Table re-renders destroy foreign nodes: re-attach whenever the host
    // goes missing instead of giving up after N attempts.
    const observer = new MutationObserver(ensure)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      stopped = true
      observer.disconnect()
      host?.remove()
      host = null
    }
  }, [])

  const buttons = (
    <>
      <Button
        variant="secondary"
        size="small"
        onClick={() => setDrawer("set-stock")}
      >
        Bulk adjust stock
      </Button>
      <Button
        variant="secondary"
        size="small"
        onClick={() => setDrawer("delete")}
      >
        Bulk delete
      </Button>
    </>
  )

  return (
    <>
      {actionsHost
        ? createPortal(buttons, actionsHost)
        : (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {buttons}
            <Text size="small" className="text-ui-fg-subtle">
              Pick products from the list, preview, then apply.
            </Text>
          </div>
        )}
      <BulkDrawer
        action="set-stock"
        open={drawer === "set-stock"}
        onOpenChange={(open) => setDrawer(open ? "set-stock" : null)}
      />
      <BulkDrawer
        action="delete"
        open={drawer === "delete"}
        onOpenChange={(open) => setDrawer(open ? "delete" : null)}
      />
    </>
  )
}

export const config = defineWidgetConfig({
  id: "nanofield:product-bulk-tools",
  zone: "product.list.before",
})

export default ProductBulkTools

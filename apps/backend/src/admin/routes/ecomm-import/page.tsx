import { useEffect, useRef, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowUpTray } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Label, Switch, Text } from "@medusajs/ui"

// JSON shapes served by /admin/shopee-imports/* (mirrors the server
// engine types; local copies because the admin bundle cannot import from
// src/api).
type PreviewSample = {
  key: string
  name: string
  variants: number
  priceRange: string
  stock: number
  action: "create" | "update"
}

type WorkbookDiag = {
  sheets: string[]
  totalRows: number
  dataRows: number
  headers: string[]
}

type PreviewInfo = {
  products: number
  variants: number
  multiVariant: number
  creates: number
  updates: number
  skipped: { pid?: string; key?: string; reason: string }[]
  categoriesToCreate: string[]
  withDescriptions: number
  withImages: number
  weightColumn: string | null
  sample: PreviewSample[]
  diag?: {
    sales: WorkbookDiag
    basic: WorkbookDiag
    media: WorkbookDiag
    ship: WorkbookDiag & { weights: number }
    descriptions: number
    mediaProducts: number
  }
}

type PreviewFiles = {
  sales: string
  basic: string | null
  media: string | null
  ship: string | null
}

type ImportReport = {
  created: number
  updated: number
  variantsAdded: number
  stockSynced: number
  categoriesCreated: number
  skipped: { pid?: string; key?: string; reason: string }[]
  errors: string[]
}

type ImportJob = {
  id: string
  createdAt: string
  filename: string
  options: {
    publishNew: boolean
    syncContent: boolean
    cleanDesc: boolean
    dryRun: boolean
  }
  state: "running" | "done" | "failed"
  events: { t: string; message: string }[]
  report?: ImportReport
  error?: string
}

const UploadRouteIcon = () => {
  // Stock Medusa icon: identical weight, grid and color behavior to every
  // other sidebar entry. Core still wraps it in the extension tile.
  return <ArrowUpTray />
}

type Files = {
  sales: File | null
  basic: File | null
  media: File | null
  ship: File | null
}

const postFiles = async (
  path: string,
  files: Files,
  options: Record<string, string>
) => {
  const form = new FormData()
  if (files.sales) {
    form.append("sales", files.sales)
  }
  if (files.basic) {
    form.append("basic", files.basic)
  }
  if (files.media) {
    form.append("media", files.media)
  }
  if (files.ship) {
    form.append("ship", files.ship)
  }
  for (const [k, v] of Object.entries(options)) {
    form.append(k, v)
  }
  const r = await fetch(path, { method: "POST", body: form })
  const data = (await r.json()) as Record<string, unknown>
  if (!r.ok) {
    throw new Error(String((data as { message?: string }).message || r.statusText))
  }
  return data
}

const FileRow = ({
  id,
  label,
  hint,
  required,
  file,
  onChange,
}: {
  id: string
  label: string
  hint: string
  required?: boolean
  file: File | null
  onChange: (f: File | null) => void
}) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id}>
      {label} {required && <span className="text-ui-fg-error">*</span>}
    </Label>
    <div className="flex items-center gap-3">
      <Input
        id={id}
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      {file && (
        <Badge color="grey" className="shrink-0">
          {(file.size / 1024).toFixed(0)} KB
        </Badge>
      )}
    </div>
    <Text size="small" className="text-ui-fg-subtle">
      {hint}
    </Text>
  </div>
)

const OptionRow = ({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) => (
  <div className="flex items-start justify-between gap-4 py-1">
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Text size="small" className="text-ui-fg-subtle">
        {hint}
      </Text>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
  </div>
)

const ImportPage = () => {
  const [files, setFiles] = useState<Files>({
    sales: null,
    basic: null,
    media: null,
    ship: null,
  })
  const [publishNew, setPublishNew] = useState(false)
  const [syncContent, setSyncContent] = useState(false)
  const [cleanDesc, setCleanDesc] = useState(true)
  const [preview, setPreview] = useState<PreviewInfo | null>(null)
  const [previewFiles, setPreviewFiles] = useState<PreviewFiles | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<ImportJob | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!jobId) {
      return
    }
    let alive = true
    const poll = async () => {
      try {
        const r = await fetch(`/admin/shopee-imports/jobs/${jobId}`)
        const data = (await r.json()) as { job: ImportJob }
        if (!alive) {
          return false
        }
        setJob(data.job)
        return data.job.state === "running"
      } catch {
        // keep polling; transient dev reloads happen
        return true
      }
    }
    void poll()
    const timer = setInterval(() => {
      void poll().then((running) => {
        if (!running) {
          clearInterval(timer)
        }
      })
    }, 2000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [jobId])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [job?.events.length])

  const runPreview = async () => {
    if (!files.sales) {
      setError("Attach the Informasi Penjualan file first.")
      return
    }
    setBusy(true)
    setError(null)
    setPreview(null)
    setPreviewFiles(null)
    try {
      const data = (await postFiles("/admin/shopee-imports/preview", files, {
        cleanDesc: String(cleanDesc),
      })) as { preview: PreviewInfo; files: PreviewFiles }
      setPreview(data.preview)
      setPreviewFiles(data.files)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const runImport = async (dryRun: boolean) => {
    if (!files.sales) {
      setError("Attach the Informasi Penjualan file first.")
      return
    }
    setBusy(true)
    setError(null)
    setJob(null)
    try {
      const data = (await postFiles("/admin/shopee-imports/execute", files, {
        publishNew: String(publishNew),
        syncContent: String(syncContent),
        cleanDesc: String(cleanDesc),
        dryRun: String(dryRun),
      })) as { jobId: string }
      setJobId(data.jobId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-8">
      <Container>
        <Heading level="h1">E-comm import</Heading>
        <Text className="text-ui-fg-subtle">
          Bulk upload / bulk edit from Shopee Seller Center Mass Update
          exports. Files never leave this server.
        </Text>
      </Container>

      <Container>
        <Heading level="h2">1. Attach exports</Heading>
        <div className="mt-3 flex flex-col gap-4">
          <FileRow
            id="imp-sales"
            label="Informasi Penjualan"
            hint="Required. Names, SKUs, IDR prices, stock, variation rows."
            required
            file={files.sales}
            onChange={(f) => setFiles((s) => ({ ...s, sales: f }))}
          />
          <FileRow
            id="imp-basic"
            label="Informasi Dasar"
            hint="Optional. Product descriptions."
            file={files.basic}
            onChange={(f) => setFiles((s) => ({ ...s, basic: f }))}
          />
          <FileRow
            id="imp-media"
            label="Informasi Media"
            hint="Optional. Category path, cover + product photos."
            file={files.media}
            onChange={(f) => setFiles((s) => ({ ...s, media: f }))}
          />
          <FileRow
            id="imp-ship"
            label="Informasi Pengiriman"
            hint="Optional. Per-variation weights in grams (Berat Produk/g) for exact shipping quotes."
            file={files.ship}
            onChange={(f) => setFiles((s) => ({ ...s, ship: f }))}
          />
        </div>
      </Container>

      <Container>
        <Heading level="h2">2. Options</Heading>
        <div className="mt-2 divide-y divide-dashed divide-ui-border-base">
          <OptionRow
            id="imp-publish"
            label="Publish new products"
            hint="Off = imports land as drafts for review (recommended)."
            checked={publishNew}
            onChange={setPublishNew}
          />
          <OptionRow
            id="imp-sync"
            label="Overwrite content on existing products"
            hint="On = description, images and categories sync from files. Off = only title, IDR price and stock update."
            checked={syncContent}
            onChange={setSyncContent}
          />
          <OptionRow
            id="imp-clean"
            label="Clean hashtag spam in descriptions"
            hint="Strips #tag noise from Shopee copy, keeps prose."
            checked={cleanDesc}
            onChange={setCleanDesc}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            color="grey"
            isLoading={busy}
            disabled={busy || !files.sales}
            onClick={() => void runPreview()}
          >
            Preview
          </Button>
          <Button
            variant="primary"
            isLoading={busy}
            disabled={busy || !files.sales}
            onClick={() => void runImport(false)}
          >
            Run import
          </Button>
        </div>
        {error && (
          <Text size="small" className="mt-3 text-ui-fg-error">
            {error}
          </Text>
        )}
      </Container>

      {preview && (
        <Container>
          <Heading level="h2">Preview — no writes made</Heading>
          {previewFiles && (
            <div className="mt-3">
              <Text size="small" className="font-medium">
                Files received by the server
              </Text>
              <div className="mt-1 divide-y divide-ui-border-base rounded-lg border border-ui-border-base">
                {(
                  [
                    ["Penjualan", previewFiles.sales, preview.diag?.sales],
                    ["Dasar", previewFiles.basic, preview.diag?.basic],
                    ["Media", previewFiles.media, preview.diag?.media],
                    ["Pengiriman", previewFiles.ship, preview.diag?.ship],
                  ] as [string, string | null, WorkbookDiag | undefined][]
                ).map(([label, name, diag]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <Text size="small" className="font-medium">
                      {label}
                    </Text>
                    <Text
                      size="xsmall"
                      className={`font-mono ${name ? "" : "text-ui-fg-subtle"}`}
                    >
                      {name
                        ? `${name} — ${diag?.dataRows ?? 0} data rows / ${diag?.totalRows ?? 0} rows`
                        : "not attached"}
                    </Text>
                  </div>
                ))}
              </div>
              {preview.diag && preview.products === 0 && (
                <Text size="small" className="mt-2 text-ui-fg-error">
                  0 products parsed. Sales headers seen: [
                  {preview.diag.sales.headers.join(" | ") || "?"}]. Make
                  sure the Informasi Penjualan file is in the Penjualan slot
                  (sheets: {preview.diag.sales.sheets.join(", ") || "?"}).
                </Text>
              )}
              {preview.diag && (
                <Text size="xsmall" className="mt-2 text-ui-fg-subtle">
                  Dasar: {preview.diag.descriptions} descriptions · Media:{" "}
                  {preview.diag.mediaProducts} products · Pengiriman:{" "}
                  {preview.diag.ship.weights} weights
                </Text>
              )}
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Products", preview.products],
              ["Variants", preview.variants],
              ["To create", preview.creates],
              ["To update", preview.updates],
              ["Multi-variant", preview.multiVariant],
              ["With images", preview.withImages],
              ["With descriptions", preview.withDescriptions],
              ["Skipped", preview.skipped.length],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-lg border border-ui-border-base p-3"
              >
                <Text size="small" className="text-ui-fg-subtle">
                  {label}
                </Text>
                <Heading level="h2">{value as number}</Heading>
              </div>
            ))}
          </div>
          {preview.categoriesToCreate.length > 0 && (
            <div className="mt-3">
              <Text size="small" className="font-medium">
                Categories to create ({preview.categoriesToCreate.length})
              </Text>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {preview.categoriesToCreate.slice(0, 20).map((c) => (
                  <Badge key={c} color="grey">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {preview.skipped.length > 0 && (
            <div className="mt-3">
              <Text size="small" className="font-medium">
                Skipped rows ({preview.skipped.length})
              </Text>
              <div className="mt-1 divide-y divide-ui-border-base rounded-lg border border-ui-border-base">
                {preview.skipped.slice(0, 20).map((s, i) => (
                  <div
                    key={`${s.pid ?? s.key ?? i}`}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <Text size="xsmall" className="font-mono">
                      {s.key || s.pid || "?"}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {s.reason}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3">
            <Text size="small" className="font-medium">
              Weight column:{" "}
              {preview.weightColumn ? (
                <Badge color="green">{preview.weightColumn}</Badge>
              ) : (
                <Badge color="red">
                  not found — variants will quote at 500g
                </Badge>
              )}
            </Text>
          </div>
          <div className="mt-3">
            <Text size="small" className="font-medium">
              Sample rows
            </Text>
            <div className="mt-1 divide-y divide-ui-border-base rounded-lg border border-ui-border-base">
              {preview.sample.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <Text size="small" className="truncate font-medium">
                      {s.name}
                    </Text>
                    <Text size="xsmall" className="font-mono text-ui-fg-subtle">
                      {s.key} · {s.variants} variant(s) · {s.priceRange} · stock {s.stock}
                    </Text>
                  </div>
                  <Badge color={s.action === "create" ? "green" : "grey"}>
                    {s.action}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Container>
      )}

      {job && (
        <Container>
          <div className="flex items-center justify-between">
            <Heading level="h2">Import progress</Heading>
            <Badge
              color={
                job.state === "done"
                  ? "green"
                  : job.state === "failed"
                    ? "red"
                    : "blue"
              }
            >
              {job.state}
            </Badge>
          </div>
          <div
            ref={logRef}
            className="mt-3 max-h-64 overflow-y-auto rounded-lg bg-ui-bg-subtle p-3 font-mono text-xs"
          >
            {job.events.map((e, i) => (
              <div key={i} className="whitespace-pre-wrap">
                {e.message}
              </div>
            ))}
            {job.events.length === 0 && (
              <span className="text-ui-fg-subtle">Starting…</span>
            )}
          </div>
          {job.report && (
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Created", job.report.created],
                ["Updated", job.report.updated],
                ["Variants added", job.report.variantsAdded],
                ["Stock synced", job.report.stockSynced],
                ["Categories created", job.report.categoriesCreated],
                ["Skipped", job.report.skipped.length],
                ["Errors", job.report.errors.length],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="rounded-lg border border-ui-border-base p-3"
                >
                  <Text size="small" className="text-ui-fg-subtle">
                    {label}
                  </Text>
                  <Heading level="h2">{value as number}</Heading>
                </div>
              ))}
            </div>
          )}
          {job.report && job.report.skipped.length > 0 && (
            <div className="mt-3">
              <Text size="small" className="font-medium">
                Skipped ({job.report.skipped.length})
              </Text>
              <div className="mt-1 divide-y divide-ui-border-base rounded-lg border border-ui-border-base">
                {job.report.skipped.slice(0, 20).map((s, i) => (
                  <div
                    key={`${s.pid ?? s.key ?? i}`}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <Text size="xsmall" className="font-mono">
                      {s.key || s.pid || "?"}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {s.reason}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          )}
          {job.report && job.report.errors.length > 0 && (
            <div className="mt-3">
              <Text size="small" className="font-medium">
                Errors ({job.report.errors.length})
              </Text>
              {job.report.errors.slice(0, 20).map((e, i) => (
                <Text key={i} size="small" className="text-ui-fg-error">
                  {e}
                </Text>
              ))}
            </div>
          )}
          {job.error && (
            <Text size="small" className="mt-3 text-ui-fg-error">
              {job.error}
            </Text>
          )}
        </Container>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "E-comm Import",
  icon: UploadRouteIcon,
  rank: 2,
})

export default ImportPage

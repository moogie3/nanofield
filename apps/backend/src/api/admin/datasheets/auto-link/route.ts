import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { computeDatasheetPatch } from "../../shopee-imports/datasheets"

// One-click bulk datasheet linking for the existing catalog (the import path
// already applies these rules to new/updated products). Dry-run scans and
// reports; apply merges patch keys into product metadata and nothing else —
// no prices, stock, status, categories, or handles are touched. Operator
// values are never overwritten (fill-empty-only by construction).
type AutoLinkJobState = "running" | "done" | "failed"

type AutoLinkReport = {
  scanned: number
  skippedLoadtest: number
  patched: number
  mpnFilled: number
  urlsLinked: number
  flagsSet: number
  sample: { handle: string; patch: Record<string, string> }[]
}

type AutoLinkJob = {
  id: string
  createdAt: string
  dryRun: boolean
  state: AutoLinkJobState
  events: { t: string; message: string }[]
  report?: AutoLinkReport
  error?: string
}

const jobs = new Map<string, AutoLinkJob>()

const createJob = (dryRun: boolean): AutoLinkJob => {
  const job: AutoLinkJob = {
    id: `dslink_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    dryRun,
    state: "running",
    events: [],
  }
  jobs.set(job.id, job)
  if (jobs.size > 20) {
    const oldest = [...jobs.values()].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1
    )[0]
    jobs.delete(oldest.id)
  }
  return job
}

const pushEvent = (job: AutoLinkJob, message: string) => {
  job.events.push({ t: new Date().toISOString(), message })
  if (job.events.length > 500) {
    job.events.splice(0, job.events.length - 500)
  }
}

const selfBaseUrl = () => `http://127.0.0.1:${process.env.PORT || 9000}`

const forwardAuth = (req: MedusaRequest): Record<string, string> => {
  const headers: Record<string, string> = {}
  const cookie = req.headers.cookie
  if (typeof cookie === "string" && cookie) {
    headers.cookie = cookie
  }
  const auth = req.headers.authorization
  if (typeof auth === "string" && auth) {
    headers.authorization = auth
  }
  return headers
}

type AdminProduct = {
  id: string
  handle: string
  title: string
  metadata: Record<string, unknown> | null
}

const emptyReport = (): AutoLinkReport => ({
  scanned: 0,
  skippedLoadtest: 0,
  patched: 0,
  mpnFilled: 0,
  urlsLinked: 0,
  flagsSet: 0,
  sample: [],
})

const scanProducts = async (
  baseUrl: string,
  headers: Record<string, string>,
  onProduct: (p: AdminProduct) => Promise<void> | void,
  onEvent?: (message: string) => void
): Promise<number> => {
  let offset = 0
  let total = Infinity
  let scanned = 0
  while (offset < total) {
    const res = await fetch(
      `${baseUrl}/admin/products?limit=100&offset=${offset}&fields=id,handle,title,metadata&order=created_at`,
      { headers }
    )
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `product list failed: HTTP ${res.status}`
      )
    }
    const json = (await res.json()) as {
      products: AdminProduct[]
      count: number
    }
    total = json.count
    if (!json.products.length) {
      break
    }
    for (const p of json.products) {
      scanned++
      await onProduct(p)
    }
    offset += json.products.length
    onEvent?.(`scanned ${scanned}/${total} products`)
  }
  return scanned
}

// POST /admin/datasheets/auto-link { dryRun } — dry-run returns the full
  // report synchronously; apply runs in the background and returns a job id.
  export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const body = (req.body || {}) as Record<string, unknown>
    const dryRun = body.dryRun !== false
    const baseUrl = selfBaseUrl()
  const headers = forwardAuth(req)
  const report = emptyReport()

  const collect = (p: AdminProduct) => {
    const meta = (p.metadata || {}) as Record<string, unknown>
    if (meta.loadtest !== undefined) {
      report.skippedLoadtest++
      return
    }
    report.scanned++
    const patch = computeDatasheetPatch(meta, p.title)
    if (!patch) {
      return
    }
    report.patched++
    if (patch.mpn) {
      report.mpnFilled++
    }
    if (patch.datasheet_url) {
      report.urlsLinked++
    }
    if (patch.has_datasheet) {
      report.flagsSet++
    }
    if (report.sample.length < 10) {
      report.sample.push({ handle: p.handle, patch })
    }
  }

  if (dryRun) {
    try {
      await scanProducts(baseUrl, headers, collect)
      res.json({ report })
    } catch (e) {
      res.status(500).json({ message: (e as Error).message })
    }
    return
  }

  const job = createJob(false)
  void (async () => {
    try {
      await scanProducts(
        baseUrl,
        headers,
        async (p) => {
          const meta = (p.metadata || {}) as Record<string, unknown>
          if (meta.loadtest !== undefined) {
            report.skippedLoadtest++
            return
          }
          report.scanned++
          const patch = computeDatasheetPatch(meta, p.title)
          if (!patch) {
            return
          }
          const put = await fetch(`${baseUrl}/admin/products/${p.id}`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ metadata: { ...meta, ...patch } }),
          })
          if (!put.ok) {
            pushEvent(job, `${p.handle}: write failed (HTTP ${put.status})`)
            return
          }
          report.patched++
          if (patch.mpn) {
            report.mpnFilled++
          }
          if (patch.datasheet_url) {
            report.urlsLinked++
          }
          if (patch.has_datasheet) {
            report.flagsSet++
          }
          if (report.sample.length < 10) {
            report.sample.push({ handle: p.handle, patch })
          }
        },
        (message) => pushEvent(job, message)
      )
      job.report = report
      job.state = "done"
      pushEvent(
        job,
        `finished: ${report.patched} patched (${report.mpnFilled} MPN, ` +
          `${report.urlsLinked} URLs, ${report.flagsSet} flags), ` +
          `${report.skippedLoadtest} loadtest skipped`
      )
    } catch (e) {
      job.state = "failed"
      job.error = (e as Error).message
      pushEvent(job, `FAILED: ${(e as Error).message}`)
    }
  })()

  res.json({ jobId: job.id })
}

// GET /admin/datasheets/auto-link?id= — poll a running apply job.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.query.id ?? "")
  const job = jobs.get(id)
  if (!job) {
    res.status(404).json({ message: "job not found" })
    return
  }
  res.json({ job })
}

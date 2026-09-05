import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  buildPlans,
  parseBasic,
  parseMedia,
  parseSales,
  runImport,
} from "../engine"
import { createJob, pushEvent } from "../jobs-store"

type UploadedFiles = {
  sales?: { buffer: Buffer; originalname: string; size: number }[]
  basic?: { buffer: Buffer; originalname: string; size: number }[]
  media?: { buffer: Buffer; originalname: string; size: number }[]
}

const selfBaseUrl = () =>
  `http://127.0.0.1:${process.env.PORT || 9000}`

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

const flag = (v: unknown): boolean => v === true || v === "true" || v === "1"

// POST /admin/shopee-imports/execute — starts the import in the background,
// returns immediately with a job id the UI polls.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const files = (req as unknown as { files?: UploadedFiles }).files || {}
  const sales = files.sales?.[0]
  if (!sales) {
    res.status(400).json({ message: "sales file (Informasi Penjualan) is required" })
    return
  }

  const options = {
    publishNew: flag(req.body?.publishNew),
    syncContent: flag(req.body?.syncContent),
    cleanDesc: flag(req.body?.cleanDesc),
    dryRun: flag(req.body?.dryRun),
  }
  const job = createJob(sales.originalname, options)
  const headers = forwardAuth(req)
  const baseUrl = selfBaseUrl()

  void (async () => {
    try {
      pushEvent(job, `parsed ${sales.originalname} (${sales.size} bytes)`)
      const { plans, skipped } = buildPlans(
        parseSales(sales.buffer),
        parseBasic(files.basic?.[0]?.buffer),
        parseMedia(files.media?.[0]?.buffer),
        options.cleanDesc
      )
      pushEvent(
        job,
        `planned ${plans.length} products, ${plans.reduce((n, p) => n + p.variants.length, 0)} variants`
      )
      const report = await runImport({
        baseUrl,
        headers,
        plans,
        skipped,
        publishNew: options.publishNew,
        syncContent: options.syncContent,
        dryRun: options.dryRun,
        onEvent: (message) => pushEvent(job, message),
      })
      job.report = report
      job.state = "done"
      pushEvent(
        job,
        `finished: ${report.created} created, ${report.updated} updated, ${report.errors.length} errors`
      )
    } catch (e) {
      job.state = "failed"
      job.error = (e as Error).message
      pushEvent(job, `FAILED: ${(e as Error).message}`)
    }
  })()

  res.json({ jobId: job.id })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  buildPlans,
  describeWorkbook,
  parseBasic,
  parseMedia,
  parseSales,
  parseShip,
  runImport,
} from "../engine"
import { createJob, pushEvent } from "../jobs-store"
import { feedRecipient, notifyFeed } from "../notify"

type UploadedFiles = {
  sales?: { buffer: Buffer; originalname: string; size: number }[]
  basic?: { buffer: Buffer; originalname: string; size: number }[]
  media?: { buffer: Buffer; originalname: string; size: number }[]
  ship?: { buffer: Buffer; originalname: string; size: number }[]
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

  const recipient = feedRecipient(req)

  void (async () => {
    try {
      const basic = files.basic?.[0]
      const media = files.media?.[0]
      const shipFile = files.ship?.[0]
      const received = [
        `sales=${sales.originalname} (${sales.size} bytes)`,
        `basic=${basic ? `${basic.originalname} (${basic.size} bytes)` : "—"}`,
        `media=${media ? `${media.originalname} (${media.size} bytes)` : "—"}`,
        `ship=${shipFile ? `${shipFile.originalname} (${shipFile.size} bytes)` : "—"}`,
      ].join(", ")
      pushEvent(job, `received ${received}`)
      const salesDiag = describeWorkbook(sales.buffer)
      const salesRows = parseSales(sales.buffer)
      const descriptions = parseBasic(files.basic?.[0]?.buffer)
      const mediaMap = parseMedia(files.media?.[0]?.buffer)
      const ship = parseShip(files.ship?.[0]?.buffer)
      pushEvent(
        job,
        `parsed sales: ${salesDiag.totalRows} rows, ${salesDiag.dataRows} data rows ` +
          `(sheets: ${salesDiag.sheets.join("|") || "?"})`
      )
      pushEvent(
        job,
        `parsed basic=${descriptions.size} descriptions, ` +
          `media=${mediaMap.size} products, ` +
          `ship=${ship.byVariation.size + ship.byProduct.size} weights`
      )
      if (!salesRows.length) {
        pushEvent(
          job,
          `WARNING: 0 sales data rows — sales headers: [${salesDiag.headers.join(" | ") || "?"}]. ` +
            `Check the Informasi Penjualan file is in the Penjualan slot (not Dasar/Media/Pengiriman).`
        )
      }
      const { plans, skipped } = buildPlans(
        salesRows,
        descriptions,
        mediaMap,
        options.cleanDesc,
        ship
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
      const drafts = options.publishNew || options.dryRun ? 0 : report.created
      await notifyFeed(req.scope, {
        to: recipient,
        title: options.dryRun
          ? `Import dry-run finished (${sales.originalname})`
          : `Shopee import finished (${sales.originalname})`,
        description:
          `${report.created} created` +
          (drafts ? ` (${drafts} as drafts)` : " (published)") +
          `, ${report.updated} updated, ${report.stockSynced} stock synced, ` +
          `${report.skipped.length} skipped, ${report.errors.length} errors.`,
      })
    } catch (e) {
      job.state = "failed"
      job.error = (e as Error).message
      pushEvent(job, `FAILED: ${(e as Error).message}`)
      await notifyFeed(req.scope, {
        to: recipient,
        title: `Shopee import failed (${sales.originalname})`,
        description: (e as Error).message,
      })
    }
  })()

  res.json({ jobId: job.id })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { buildPreview } from "../engine"

type UploadedFiles = {
  sales?: { buffer: Buffer; originalname: string; size: number }[]
  basic?: { buffer: Buffer; originalname: string; size: number }[]
  media?: { buffer: Buffer; originalname: string; size: number }[]
}

const selfBaseUrl = () =>
  `http://127.0.0.1:${process.env.PORT || 9000}`

// Forward the operator's own session so self-calls run with their permissions.
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

// POST /admin/shopee-imports/preview — parse uploaded templates, plan the
// import, report creates/updates. No writes.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const files = (req as unknown as { files?: UploadedFiles }).files || {}
  const sales = files.sales?.[0]
  if (!sales) {
    res.status(400).json({ message: "sales file (Informasi Penjualan) is required" })
    return
  }
  const cleanDesc =
    req.body?.cleanDesc === true || req.body?.cleanDesc === "true" || req.body?.cleanDesc === "1"

  try {
    const preview = await buildPreview({
      baseUrl: selfBaseUrl(),
      headers: forwardAuth(req),
      salesBuf: sales.buffer,
      basicBuf: files.basic?.[0]?.buffer,
      mediaBuf: files.media?.[0]?.buffer,
      cleanDesc,
    })
    res.json({
      preview,
      files: {
        sales: sales.originalname,
        basic: files.basic?.[0]?.originalname || null,
        media: files.media?.[0]?.originalname || null,
      },
    })
  } catch (e) {
    res.status(500).json({ message: (e as Error).message })
  }
}

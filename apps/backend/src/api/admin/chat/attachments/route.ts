import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  storeChatImage,
} from "../../../../modules/chat/route-helpers"
import type { ChatUploadFile } from "../../../../modules/chat/route-helpers"

// Operator image upload (multipart, field `file`). Same storage rules as
// the visitor route; admin session auth is the default for /admin/*. The
// returned relative path goes into POST .../messages as image_url.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const file = (req as unknown as { file?: ChatUploadFile }).file
  if (!file) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "image file is required (multipart field: file)"
    )
  }
  const url = await storeChatImage(req, file)
  res.status(201).json({
    url,
    name: file.originalname,
    mime: file.mimetype,
    size: file.buffer.length,
  })
}

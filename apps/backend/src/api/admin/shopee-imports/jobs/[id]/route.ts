import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getJob } from "../../jobs-store"

// GET /admin/shopee-imports/jobs/:id — poll import progress + final report.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const job = getJob(req.params.id)
  if (!job) {
    res.status(404).json({ message: "import job not found" })
    return
  }
  res.json({ job })
}

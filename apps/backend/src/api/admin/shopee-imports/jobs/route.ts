import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getJob, listJobs } from "../jobs-store"

// GET /admin/shopee-imports/jobs — recent import jobs (newest first).
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json({ jobs: listJobs() })
}

import type { ImportReport } from "./engine"

export type ImportJobState = "running" | "done" | "failed"

export type ImportJob = {
  id: string
  createdAt: string
  filename: string
  options: {
    publishNew: boolean
    syncContent: boolean
    cleanDesc: boolean
    dryRun: boolean
  }
  state: ImportJobState
  events: { t: string; message: string }[]
  report?: ImportReport
  error?: string
}

// In-process registry (single instance). For multi-instance production this
// becomes a persisted workflow execution; the API shape stays the same.
const jobs = new Map<string, ImportJob>()

export const createJob = (
  filename: string,
  options: ImportJob["options"]
): ImportJob => {
  const job: ImportJob = {
    id: `simp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    filename,
    options,
    state: "running",
    events: [],
  }
  jobs.set(job.id, job)
  // Keep the registry bounded.
  if (jobs.size > 20) {
    const oldest = [...jobs.values()].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1
    )[0]
    jobs.delete(oldest.id)
  }
  return job
}

export const getJob = (id: string): ImportJob | undefined => jobs.get(id)

export const listJobs = (): ImportJob[] =>
  [...jobs.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

export const pushEvent = (job: ImportJob, message: string) => {
  job.events.push({ t: new Date().toISOString(), message })
  if (job.events.length > 500) {
    job.events.splice(0, job.events.length - 500)
  }
}

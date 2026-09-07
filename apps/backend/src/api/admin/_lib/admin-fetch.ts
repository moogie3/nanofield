import type { MedusaRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

// Same-process Admin REST calls from custom API routes. Auth is forwarded
// from the incoming admin session (cookie or bearer), so no service key is
// needed and permissions match the logged-in user.
export const selfBaseUrl = () =>
  `http://127.0.0.1:${process.env.PORT || 9000}`

export const forwardAuth = (req: MedusaRequest): Record<string, string> => {
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

export const apiGet = async (
  baseUrl: string,
  headers: Record<string, string>,
  path: string
): Promise<any> => {
  const r = await fetch(`${baseUrl}${path}`, { headers })
  if (!r.ok) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `GET ${path}: ${r.status} ${r.statusText}`
    )
  }
  return r.json()
}

export const apiSend = async (
  baseUrl: string,
  headers: Record<string, string>,
  method: string,
  path: string,
  body?: unknown
): Promise<any> => {
  const r = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...headers, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => r.statusText)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${method} ${path}: ${r.status} ${text}`
    )
  }
  if (r.status === 204) {
    return null
  }
  const text = await r.text()
  return text ? JSON.parse(text) : null
}

// Bounded parallel worker pool that preserves input order in the output.
// Bulk jobs touch thousands of rows; sequential self-REST calls would take
// many minutes, unbounded parallelism would swamp the server.
export const runPool = async <T, R>(
  items: T[],
  size: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const out: R[] = new Array(items.length)
  let i = 0
  const workers = Array.from(
    { length: Math.max(1, Math.min(size, items.length)) },
    async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx], idx)
      }
    }
  )
  await Promise.all(workers)
  return out
}

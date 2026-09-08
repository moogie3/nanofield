import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// TEMPORARY diagnostic: lists container keys. Deleted after use.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const scope = req.scope as unknown as {
    registrations?: Record<string, unknown>
    resolve: (key: string) => unknown
  }
  const keys = Object.keys(scope.registrations || {})
  const interesting = keys.filter((k) =>
    /manager|pg|query|product|logger/i.test(k)
  )
  const probes: Record<string, string> = {}
  for (const k of [
    "manager",
    "__pg_connection__",
    "query",
    "logger",
    "productModuleService",
  ]) {
    try {
      const v = scope.resolve(k) as Record<string, unknown> | null
      const methods = v
        ? Object.getOwnPropertyNames(Object.getPrototypeOf(v))
            .filter((m) => ["execute", "raw", "query", "graph"].includes(m))
            .join(",")
        : "null"
      probes[k] = typeof v + (methods ? ` [${methods}]` : "")
    } catch (e) {
      probes[k] = `THROWS: ${(e as Error).message.slice(0, 80)}`
    }
  }
  // Inspect the pg connection shape + attempt a trivial query.
  let pgInfo = "n/a"
  try {
    const conn = scope.resolve("__pg_connection__") as Record<string, unknown>
    const ownKeys = Object.keys(conn || {}).slice(0, 20).join(",")
    const protoMethods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(conn || {})
    )
      .slice(0, 30)
      .join(",")
    pgInfo = `typeof=${typeof conn} own=[${ownKeys}] proto=[${protoMethods}]`
    const raw = conn?.["raw"] as
      | ((sql: string, params?: unknown[]) => Promise<unknown>)
      | undefined
    if (typeof raw === "function") {
      const out = (await raw.call(conn, "SELECT 1 AS one", [])) as {
        rows?: unknown[]
      }
      pgInfo += ` rawAttempt=OK rows=${JSON.stringify(out?.rows ?? out).slice(0, 80)}`
    } else {
      pgInfo += " rawAttempt=SKIPPED(no .raw)"
    }
  } catch (e) {
    pgInfo = `ERROR: ${(e as Error).message.slice(0, 200)}`
  }
  res.status(200).json({ interesting, probes, pgInfo })
}

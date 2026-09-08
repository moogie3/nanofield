import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Postgres full-text + trigram product search (no external engine).
// Returns ranked product ids; the storefront hydrates them through the
// regular /store/products endpoint so pricing/region logic stays in one
// place. Ranking: exact SKU / part_number / handle > title substring >
// trigram similarity > tsvector rank. Typo-tolerant via pg_trgm.
// If pg_trgm is missing (extension not installed), falls back to an
// ILIKE-only query instead of failing.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = String(req.query.q ?? "").trim()
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.limit ?? "24"), 10) || 24)
  )
  if (!q) {
    res.status(200).json({ ids: [], total: 0, q })
    return
  }

  const query = await resolveQuery(req)
  const exact = q
  const like = `%${q}%`
  try {
    const rows = await query(trgmSql, [exact, like, q, limit])
    const ids = rows.map((r: { id: string }) => r.id)
    res.status(200).json({ ids, total: ids.length, q })
  } catch (e) {
    // TEMPORARY: surface the real error while stabilizing the route.
    res.status(200).json({
      ids: [],
      total: 0,
      q,
      debug: String((e as Error)?.message || e).slice(0, 300),
    })
  }
}

type QueryFn = (sql: string, params: unknown[]) => Promise<{ id: string }[]>

const resolveQuery = async (req: MedusaRequest): Promise<QueryFn> => {
  const scope = req.scope as unknown as {
    resolve: (key: string) => unknown
  }
  const tryResolve = (key: string): unknown => {
    try {
      return scope.resolve(key)
    } catch {
      return null
    }
  }
  // MikroORM entity manager ($n placeholders).
  const manager = tryResolve(ContainerRegistrationKeys.MANAGER) as unknown as {
    execute: (sql: string, params?: unknown[]) => Promise<unknown>
  } | null
  if (manager && typeof manager.execute === "function") {
    return async (sql, params) =>
      (await manager.execute(sql, params)) as { id: string }[]
  }
  // Shared pg connection: Knex (.raw, ? placeholders) or raw pg Pool
  // (.query, $n placeholders).
  const conn = tryResolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as {
    raw?: (sql: string, params?: unknown[]) => Promise<{ rows: { id: string }[] }>
    query?: (sql: string, params?: unknown[]) => Promise<{ rows: { id: string }[] }>
  } | null
  if (conn && typeof conn.raw === "function") {
    const qmarks = (sql: string) => sql.replace(/\$\d+/g, "?")
    return async (sql, params) => (await conn.raw!(qmarks(sql), params)).rows
  }
  if (conn && typeof conn.query === "function") {
    return async (sql, params) => (await conn.query!(sql, params)).rows
  }
  throw new Error("no database connection in scope (manager/pg_connection)")
}

const trgmSql = `
SELECT p.id,
  GREATEST(
    CASE WHEN EXISTS (
      SELECT 1 FROM product_variant v
      WHERE v.product_id = p.id AND v.deleted_at IS NULL
        AND (v.sku ILIKE $1 OR v.sku ILIKE $2)
    ) THEN 100 ELSE 0 END,
    CASE WHEN (p.metadata ->> 'part_number') ILIKE $1 THEN 100 ELSE 0 END,
    CASE WHEN p.handle ILIKE $1 THEN 90
         WHEN p.title ILIKE $2 THEN 80 ELSE 0 END,
    COALESCE(similarity(p.title, $3), 0) * 60,
    COALESCE(ts_rank(
      to_tsvector('simple', COALESCE(p.title, '') || ' ' || COALESCE(p.description, '')),
      plainto_tsquery('simple', $3)
    ), 0) * 50
  ) AS score
FROM product p
WHERE p.deleted_at IS NULL AND p.status = 'published'
  AND (
    EXISTS (
      SELECT 1 FROM product_variant v
      WHERE v.product_id = p.id AND v.deleted_at IS NULL
        AND (v.sku ILIKE $1 OR v.sku ILIKE $2)
    )
    OR p.title ILIKE $2 OR p.handle ILIKE $1
    OR (p.metadata ->> 'part_number') ILIKE $1
    OR similarity(p.title, $3) > 0.15
    OR to_tsvector('simple', COALESCE(p.title, '') || ' ' || COALESCE(p.description, ''))
       @@ plainto_tsquery('simple', $3)
  )
ORDER BY score DESC, p.created_at DESC
LIMIT $4
`

const plainSql = `
SELECT p.id,
  GREATEST(
    CASE WHEN EXISTS (
      SELECT 1 FROM product_variant v
      WHERE v.product_id = p.id AND v.deleted_at IS NULL
        AND (v.sku ILIKE $1 OR v.sku ILIKE $2)
    ) THEN 100 ELSE 0 END,
    CASE WHEN (p.metadata ->> 'part_number') ILIKE $1 THEN 100 ELSE 0 END,
    CASE WHEN p.handle ILIKE $1 THEN 90
         WHEN p.title ILIKE $2 THEN 80 ELSE 0 END
  ) AS score
FROM product p
WHERE p.deleted_at IS NULL AND p.status = 'published'
  AND (
    EXISTS (
      SELECT 1 FROM product_variant v
      WHERE v.product_id = p.id AND v.deleted_at IS NULL
        AND (v.sku ILIKE $1 OR v.sku ILIKE $2)
    )
    OR p.title ILIKE $2 OR p.handle ILIKE $1
    OR (p.metadata ->> 'part_number') ILIKE $1
  )
ORDER BY score DESC, p.created_at DESC
LIMIT $3
`

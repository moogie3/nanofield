import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

// Filter facets for the catalog sidebar (Phase 5): distinct option values,
// spec axis values, and the datasheet-flag count across published products.
// Optional ?category_id= scoping (repeatable). Small GROUP BY payloads —
// deliberately NOT derived from the product list, so the sidebar never pays
// for full product hydration. Published-only, like /store/search.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = await resolveQuery(req)
  const categoryIds = paramList(req.query.category_id)
  try {
    const [options, specs, datasheet] = await Promise.all([
      query(optionSql(categoryIds.length), [...categoryIds]) as Promise<{
        value: string
        count: string
        ids: string[]
      }[]>,
      query(specSql(categoryIds.length), [...categoryIds]) as Promise<{ axis: string; value: string; count: string }[]>,
      query(datasheetSql(categoryIds.length), [
        ...categoryIds,
      ]) as Promise<{ count: string }[]>,
    ])
    res.status(200).json({
      options: options.map((r) => ({
        value: r.value,
        count: Number(r.count),
        // Every option-value row id behind the display value: the storefront
        // passes these as ?optionValueIds= (the native id filter), so one
        // checked value selects all rows sharing it.
        ids: Array.isArray(r.ids) ? r.ids : [],
      })),
      specs: specs.map((r) => ({
        axis: r.axis,
        value: r.value,
        count: Number(r.count),
      })),
      datasheetCount: Number(datasheet[0]?.count ?? 0),
    })
  } catch (e) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `facets failed: ${(e as Error).message}`
    )
  }
}

const paramList = (raw: unknown): string[] => {
  const values = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
  return [...new Set(values.filter((v) => typeof v === "string" && v))]
}

// $1..$n category ids for the optional scope branch.
const scopeJoin = (tableAlias: string, count: number, start: number): string => {
  if (!count) {
    return ""
  }
  const placeholders = Array.from(
    { length: count },
    (_, i) => `$${start + i}`
  ).join(", ")
  return `JOIN product_category_product pcp ON pcp.product_id = ${tableAlias}.id
    JOIN product_category c ON c.id = pcp.product_category_id AND c.deleted_at IS NULL
      AND c.id IN (${placeholders})`
}

const optionSql = (scopeCount: number): string => `
SELECT pov.value AS value, COUNT(DISTINCT v.product_id)::text AS count,
  ARRAY_AGG(DISTINCT pov.id)::text[] AS ids
FROM product_option_value pov
JOIN product_variant_option vo ON vo.option_value_id = pov.id
JOIN product_variant v ON v.id = vo.variant_id
JOIN product p ON p.id = v.product_id
${scopeJoin("p", scopeCount, 1)}
WHERE pov.deleted_at IS NULL AND v.deleted_at IS NULL
  AND p.deleted_at IS NULL AND p.status = 'published'
GROUP BY pov.value ORDER BY count DESC, pov.value ASC
`

const specSql = (scopeCount: number): string => `
SELECT s.axis AS axis, s.value AS value, COUNT(*)::text AS count FROM (
  SELECT DISTINCT p.id AS pid,
    kv.k AS axis,
    TRIM(BOTH ' ' FROM UNNEST(STRING_TO_ARRAY(kv.v, ','))) AS value
  FROM product p CROSS JOIN LATERAL jsonb_each_text(p.metadata) AS kv(k, v)
  ${scopeJoin("p", scopeCount, 1)}
  WHERE p.deleted_at IS NULL AND p.status = 'published'
    AND kv.k LIKE 'spec\\_%' AND kv.k <> 'spec_family'
) s WHERE s.value <> '' GROUP BY s.axis, s.value ORDER BY s.axis ASC, count DESC
`

const datasheetSql = (scopeCount: number): string => `
SELECT COUNT(*)::text AS count FROM product p
${scopeJoin("p", scopeCount, 1)}
WHERE p.deleted_at IS NULL AND p.status = 'published'
  AND p.metadata ->> 'has_datasheet' = 'true'
`

type QueryFn = (sql: string, params: unknown[]) => Promise<unknown[]>

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
  const manager = tryResolve(ContainerRegistrationKeys.MANAGER) as unknown as {
    execute: (sql: string, params?: unknown[]) => Promise<unknown>
  } | null
  if (manager && typeof manager.execute === "function") {
    return async (sql, params) =>
      (await manager.execute(sql, params)) as unknown[]
  }
  const conn = tryResolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as {
    raw?: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
    query?: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
  } | null
  if (conn && typeof conn.raw === "function") {
    return async (sql, params) => {
      const ordered: unknown[] = []
      const converted = sql.replace(/\$(\d+)/g, (_m, n: string) => {
        ordered.push(params[Number(n) - 1])
        return "?"
      })
      return (await conn.raw!(converted, ordered)).rows
    }
  }
  if (conn && typeof conn.query === "function") {
    return async (sql, params) => (await conn.query!(sql, params)).rows
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "no database connection in scope (manager/pg_connection)"
  )
}

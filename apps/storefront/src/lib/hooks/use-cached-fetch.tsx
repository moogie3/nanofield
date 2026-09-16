import { useEffect, useState } from "react"

export type FacetPayload = {
  options: { value: string; count: number; ids: string[] }[]
  specs: { axis: string; value: string; count: number }[]
  datasheetCount: number
}

// Shared JSON fetch with in-flight dedup + short TTL. Several sidebar
// filters request the same URL on mount (facets x3) — without this each
// pays a full Next-proxy → backend round-trip. Entries live 60s: fresh
// enough for filter aids, cheap enough to stay correct after admin edits.
const TTL_MS = 60_000

const cache = new Map<string, { at: number; promise: Promise<unknown> }>()

function fetchOnce<T>(url: string): Promise<T> {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.promise as Promise<T>
  }
  const promise = fetch(url).then(async (response) => {
    if (!response.ok) {
      cache.delete(url)
      throw new Error(`GET ${url} -> ${response.status}`)
    }
    return (await response.json()) as T
  })
  promise.catch(() => {
    if (cache.get(url)?.promise === promise) {
      cache.delete(url)
    }
  })
  cache.set(url, { at: Date.now(), promise })
  return promise
}

export function useCachedFetch<T>(url: string | null): T | null {  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    if (!url) {
      return
    }
    let alive = true
    fetchOnce<T>(url)
      .then((result) => {
        if (alive) {
          setData(result)
        }
      })
      .catch(() => {
        // Callers render their degraded state when data stays null.
      })
    return () => {
      alive = false
    }
  }, [url])

  return data
}

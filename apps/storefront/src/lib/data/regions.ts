"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const listRegions = async () => {
  const next = {
    ...(await getCacheOptions("regions")),
  }

  return await sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ regions }) => regions)
}

export const retrieveRegion = async (id: string) => {
  const next = {
    ...(await getCacheOptions(["regions", id].join("-"))),
  }

  return await sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region)
}

const regionMap = new Map<string, HttpTypes.StoreRegion>()

export const getRegion = async (countryCode: string) => {
  const normalized = countryCode?.toLowerCase()

  if (normalized && regionMap.has(normalized)) {
    return regionMap.get(normalized)
  }

  const regions = await listRegions()

  if (!regions) {
    return null
  }

  regionMap.clear()
  regions.forEach((region) => {
    region.countries?.forEach((c) => {
      const code = c?.iso_2?.toLowerCase()
      if (code) {
        regionMap.set(code, region)
      }
    })
  })

  const region = normalized
    ? regionMap.get(normalized)
    : regionMap.get("us")

  return region
}

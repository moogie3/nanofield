import {
  AbstractFulfillmentProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  Logger,
  MedusaContainer,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import {
  BUILT_IN_SERVICES,
  mergeCatalog,
  type CourierService,
  type ShippingServiceRow,
} from "../rajaongkir/catalog"

type RajaongkirModuleOptions = {
  apiKey?: string
  baseUrl?: string
  // Preferred origin: numeric subdistrict id (one-time lookup). When unset,
  // the origin text below is resolved through destination search instead.
  originId?: number
  origin?: string
  defaultWeightG?: number
  fallbackAmount?: number
}

// Container keys of the catalog module service, first hit wins. Resolved
// lazily per call — never at construct time, so provider boot never depends
// on the catalog module, and a missing table simply yields defaults.
const CATALOG_SERVICE_KEYS = ["rajaongkir", "rajaongkirModuleService"]

type CatalogService = {
  listShippingServices: (
    filters?: Record<string, unknown>
  ) => Promise<ShippingServiceRow[]>
}

// Destination search results: subdistrict-level entries. Only `id` is
// structural — every other field is matched tolerantly, since Komerce may
// rename labels without notice. Unknown shapes must fall back, never throw.
type DestinationEntry = {
  id: number | string
  [key: string]: unknown
}

type CourierQuote = {
  code?: string
  service?: string
  cost?: number
  [key: string]: unknown
}

// Destination ids are static data: cached per process for 24h keyed by
// normalized query (V2 best practice: cache static data, debounce search).
// Cost quotes are always requested live — never cached.
const destCache = new Map<string, { fetchedAt: number; entries: DestinationEntry[] }>()
let originCache: number | null = null
const DEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 10000

const normalizePlace = (s: string): string =>
  s
    .toLowerCase()
    .replace(/^(kota|kab\.?|kabupaten)\s+administrasi\s+/, "")
    .replace(/^(kota|kab\.?|kabupaten)\s+/, "")
    .trim()

class RajaongkirFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "rajaongkir"

  protected logger_: Logger
  protected options_: RajaongkirModuleOptions
  protected container_: MedusaContainer

  constructor(
    container: MedusaContainer & { logger: Logger },
    options?: RajaongkirModuleOptions
  ) {
    super()
    this.container_ = container
    this.logger_ = container.logger
    this.options_ = options ?? {}
  }

  protected apiKey_(): string {
    return this.options_.apiKey ?? ""
  }

  protected baseUrl_(): string {
    return this.options_.baseUrl ?? "https://rajaongkir.komerce.id/api/v1"
  }

  protected headers_(): Record<string, string> {
    return { key: this.apiKey_() }
  }

  protected originId_(): number | null {
    const raw = this.options_.originId
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null
  }

  protected origin_(): string {
    return this.options_.origin ?? "Jambi"
  }

  protected defaultWeightG_(): number {
    return this.options_.defaultWeightG ?? 500
  }

  protected fallbackAmount_(): number {
    return this.options_.fallbackAmount ?? 20000
  }

  // Merged catalog: built-ins overlaid with admin-managed DB rows.
  // Falls back to built-ins when the catalog module/table is unavailable,
  // so quoting (and boot) never depends on admin configuration existing.
  protected async catalog_(): Promise<CourierService[]> {
    for (const key of CATALOG_SERVICE_KEYS) {
      try {
        const catalog = (
          this.container_.resolve as unknown as (
            k: string
          ) => CatalogService | null
        )(key)
        if (catalog && typeof catalog.listShippingServices === "function") {
          const rows = await catalog.listShippingServices({})
          return mergeCatalog(Array.isArray(rows) ? rows : []).services
        }
      } catch {
        // try the next key, fall back to built-ins below
      }
    }
    return [...BUILT_IN_SERVICES]
  }

  getIdentifier(): string {
    return RajaongkirFulfillmentProviderService.identifier
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return (await this.catalog_()).map((s) => ({
      id: s.id,
      name: s.name,
      courier: s.courier,
      service: s.service,
    }))
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    // Build the shipping-method data Medusa persists: the fulfillment-option
    // payload ({ id, courier, service }). Without this the method data stays
    // empty and createFulfillment can no longer stamp courier/service on the
    // fulfillment (AWB is booked manually from exactly those fields).
    const id =
      (data as Record<string, unknown> | undefined)?.id ??
      (optionData as Record<string, unknown> | undefined)?.id
    const svc =
      typeof id === "string"
        ? (await this.catalog_()).find((s) => s.id === id)
        : undefined
    return {
      ...data,
      id: svc?.id ?? id,
      courier:
        svc?.courier ??
        (optionData as Record<string, unknown> | undefined)?.courier,
      service:
        svc?.service ??
        (optionData as Record<string, unknown> | undefined)?.service,
    }
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return (await this.catalog_()).some((s) => s.id === data?.id)
  }

  async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
    const id = (data?.data as Record<string, unknown> | undefined)?.id
    if (!id) {
      return true
    }
    return (await this.catalog_()).some((s) => s.id === id)
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    const fallback: CalculatedShippingOptionPrice = {
      calculated_amount: this.fallbackAmount_(),
      is_calculated_price_tax_inclusive: false,
    }
    try {
      const services = await this.catalog_()
      const svc = services.find((s) => s.id === optionData.id)
      if (!svc || !this.apiKey_()) {
        return fallback
      }
      const city = context.shipping_address?.city
      if (!city) {
        return fallback
      }
      const originId = await this.resolveOrigin_()
      const destId = await this.resolveDestination_(
        city,
        context.shipping_address?.province ?? undefined
      )
      if (originId === null || destId === null) {
        return fallback
      }
      // One call for every enabled courier; split client-side by `code`.
      // Keeps the free-tier 100 hits/day quota as far as possible.
      const couriers = [...new Set(services.map((s) => s.courier))]
      const quotes = await this.quoteCosts_(
        originId,
        destId,
        this.cartWeightG_(context.items),
        couriers
      )
      const amount = this.pickQuote_(quotes, svc)
      if (amount === null) {
        return fallback
      }
      return {
        calculated_amount: amount,
        is_calculated_price_tax_inclusive: false,
      }
    } catch (e) {
      // A failed quote must never block checkout: fall back to the flat rate.
      this.logger_.warn(
        `rajaongkir: calculatePrice failed, using fallback — ${
          (e as Error).message
        }`
      )
      return fallback
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<
      Omit<FulfillmentDTO, "provider_id" | "data" | "items">
    >,
    additionalData?: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    // No booking API on this tier: the AWB is booked manually in the
    // courier agent app, then entered as tracking number on the fulfillment.
    const svc = (await this.catalog_()).find((s) => s.id === data.id)
    return {
      data: {
        ...data,
        courier: svc?.courier,
        service: svc?.service,
        manual_booking: true,
      },
      labels: [],
    }
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<unknown> {
    // Nothing remote to cancel: AWBs live in the courier agent app.
    return {}
  }

  protected cartWeightG_(
    items: CalculateShippingOptionPriceDTO["context"]["items"]
  ): number {
    const total = items.reduce((sum, item) => {
      const variantWeight = (item as { variant?: { weight?: unknown } })
        .variant?.weight
      const unit =
        typeof variantWeight === "number" && variantWeight > 0
          ? variantWeight
          : this.defaultWeightG_()
      const qty = Number(item.quantity)
      return sum + unit * (Number.isFinite(qty) && qty > 0 ? qty : 1)
    }, 0)
    return Math.max(1, Math.round(total))
  }

  protected async resolveOrigin_(): Promise<number | null> {
    const pinned = this.originId_()
    if (pinned !== null) {
      return pinned
    }
    if (originCache !== null) {
      return originCache
    }
    const id = await this.resolveDestination_(this.origin_())
    originCache = id
    return id
  }

  protected async resolveDestination_(
    city: string,
    province?: string
  ): Promise<number | null> {
    const entries = await this.searchDestinations_(city)
    if (!entries.length) {
      return null
    }
    const want = normalizePlace(city)
    const scored = entries
      .map((e) => {
        const haystack = Object.values(e)
          .filter((v) => typeof v === "string")
          .join(" ")
          .toLowerCase()
        if (!want || !haystack.includes(want)) {
          return { e, score: -1 }
        }
        let score = 1
        if (haystack.includes(` ${want} `) || haystack.startsWith(want)) {
          score += 1
        }
        if (province) {
          const wp = province.toLowerCase().trim()
          if (wp && haystack.includes(wp)) {
            score += 2
          }
        }
        return { e, score }
      })
      .filter((s) => s.score >= 0)
      .sort((a, b) => b.score - a.score)
    if (!scored.length) {
      return null
    }
    const id = Number(scored[0].e.id)
    return Number.isFinite(id) ? id : null
  }

  protected async searchDestinations_(
    query: string
  ): Promise<DestinationEntry[]> {
    const key = normalizePlace(query)
    const cached = destCache.get(key)
    if (cached && Date.now() - cached.fetchedAt < DEST_CACHE_TTL_MS) {
      return cached.entries
    }
    const params = new URLSearchParams({
      search: query,
      limit: "5",
      offset: "0",
    })
    const res = await fetch(
      `${this.baseUrl_()}/destination/domestic-destination?${params}`,
      {
        headers: this.headers_(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    )
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `destination search failed: HTTP ${res.status}`
      )
    }
    const json = (await res.json()) as {
      meta?: { message?: string; status?: string }
      data?: DestinationEntry[]
    }
    if (
      typeof json.meta?.status === "string" &&
      !/success|ok/i.test(json.meta.status)
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `destination search failed: ${json.meta.message ?? json.meta.status}`
      )
    }
    const entries = Array.isArray(json.data) ? json.data : []
    destCache.set(key, { fetchedAt: Date.now(), entries })
    return entries
  }

  protected async quoteCosts_(
    originId: number,
    destId: number,
    weightG: number,
    couriers: string[]
  ): Promise<CourierQuote[]> {
    const body = new URLSearchParams({
      origin: String(originId),
      destination: String(destId),
      weight: String(weightG),
      courier: couriers.join(":"),
    })
    const res = await fetch(`${this.baseUrl_()}/calculate/domestic-cost`, {
      method: "POST",
      headers: {
        ...this.headers_(),
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `cost request failed: HTTP ${res.status}`
      )
    }
    const json = (await res.json()) as {
      meta?: { message?: string; status?: string }
      data?: CourierQuote[]
    }
    if (
      typeof json.meta?.status === "string" &&
      !/success|ok/i.test(json.meta.status)
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `cost request failed: ${json.meta.message ?? json.meta.status}`
      )
    }
    return Array.isArray(json.data) ? json.data : []
  }

  protected pickQuote_(
    quotes: CourierQuote[],
    svc: CourierService
  ): number | null {
    const mine = quotes.filter(
      (q) =>
        typeof q.code === "string" &&
        q.code.toLowerCase() === svc.courier.toLowerCase() &&
        typeof q.cost === "number"
    )
    if (!mine.length) {
      return null
    }
    if (!svc.anyService) {
      const exact = mine.find(
        (q) =>
          typeof q.service === "string" &&
          q.service.toUpperCase() === svc.service.toUpperCase()
      )
      // Exact services must quote ONLY their own service. Falling through
      // to the courier cheapest here would mislabel e.g. REG speed as CTC
      // on lanes without CTC. Null lets calculatePrice use the flat
      // fallback, which operators read as "not on this lane".
      if (!exact || typeof exact.cost !== "number") {
        return null
      }
      return exact.cost
    }
    return Math.min(...mine.map((q) => q.cost as number))
  }
}

export default RajaongkirFulfillmentProviderService

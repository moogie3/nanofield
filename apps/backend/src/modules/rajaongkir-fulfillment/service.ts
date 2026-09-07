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
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"

type RajaongkirModuleOptions = {
  apiKey?: string
  baseUrl?: string
  origin?: string
  couriers?: string
  defaultWeightG?: number
  fallbackAmount?: number
}

type CourierService = {
  id: string
  courier: string
  service: string
  name: string
  // When true, quote the cheapest service this courier returns instead of
  // matching `service` exactly. Used for POS, whose Starter service codes
  // vary by route — the option is labeled "(ekonomis)" to stay honest.
  anyService?: boolean
}

// Starter-plan couriers: JNE + POS. J&T is Pro-only on RajaOngkir, so it is
// out until a Pro upgrade (one-line addition then: base URL + jnt service).
// The admin creates one calculated shipping option per entry below.
const ALL_SERVICES: CourierService[] = [
  { id: "jne-reg", courier: "jne", service: "REG", name: "JNE REG (2-3 hari)" },
  {
    id: "jne-oke",
    courier: "jne",
    service: "OKE",
    name: "JNE OKE ekonomis (3-5 hari)",
  },
  { id: "jne-yes", courier: "jne", service: "YES", name: "JNE YES (1 hari)" },
  {
    id: "pos-eco",
    courier: "pos",
    service: "ECO",
    name: "POS Indonesia (ekonomis)",
    anyService: true,
  },
]

type RajaCity = {
  city_id: string
  city_name: string
  province: string
  type: string
}

type RajaCost = {
  service: string
  cost: { value: number }[]
}

// City list is static data: cached per process for 24h. RajaOngkir's usage
// rules explicitly allow caching province/city, but cost quotes must be
// requested live on every calculation — so costs are never cached.
let cityCache: { fetchedAt: number; cities: RajaCity[] } | null = null
const CITY_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 10000

const normalizeCity = (s: string): string =>
  s
    .toLowerCase()
    .replace(/^(kota|kab\.?|kabupaten)\s+administrasi\s+/, "")
    .replace(/^(kota|kab\.?|kabupaten)\s+/, "")
    .trim()

class RajaongkirFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "rajaongkir"

  protected logger_: Logger
  protected options_: RajaongkirModuleOptions

  constructor(
    { logger }: { logger: Logger },
    options?: RajaongkirModuleOptions
  ) {
    super()
    this.logger_ = logger
    this.options_ = options ?? {}
  }

  protected apiKey_(): string {
    return this.options_.apiKey ?? ""
  }

  protected baseUrl_(): string {
    return this.options_.baseUrl ?? "https://api.rajaongkir.com/starter"
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

  protected services_(): CourierService[] {
    const allowed = (this.options_.couriers ?? "jne,pos")
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean)
    return ALL_SERVICES.filter((s) => allowed.includes(s.courier))
  }

  getIdentifier(): string {
    return RajaongkirFulfillmentProviderService.identifier
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return this.services_().map((s) => ({
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
    return { ...data }
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return this.services_().some((s) => s.id === data?.id)
  }

  async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
    const id = (data?.data as Record<string, unknown> | undefined)?.id
    if (!id) {
      return true
    }
    return this.services_().some((s) => s.id === id)
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
      const svc = this.services_().find((s) => s.id === optionData.id)
      if (!svc || !this.apiKey_()) {
        return fallback
      }
      const city = context.shipping_address?.city
      if (!city) {
        return fallback
      }
      const cities = await this.listCities_()
      const origin = this.matchCity_(cities, this.origin_())
      const dest = this.matchCity_(
        cities,
        city,
        context.shipping_address?.province ?? undefined
      )
      if (!origin || !dest) {
        return fallback
      }
      const weight = this.cartWeightG_(context.items)
      const amount = await this.quoteCost_(
        svc,
        origin.city_id,
        dest.city_id,
        weight
      )
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
    // Starter has no booking API: the AWB is booked manually in the
    // JNE/J&T agent app, then entered as tracking number on the fulfillment.
    const svc = this.services_().find((s) => s.id === data.id)
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

  protected async listCities_(): Promise<RajaCity[]> {
    if (cityCache && Date.now() - cityCache.fetchedAt < CITY_CACHE_TTL_MS) {
      return cityCache.cities
    }
    const res = await fetch(
      `${this.baseUrl_()}/city?key=${encodeURIComponent(this.apiKey_())}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
    )
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `city list request failed: HTTP ${res.status}`
      )
    }
    const json = (await res.json()) as {
      rajaongkir: { status: { code: number }; results: RajaCity[] }
    }
    if (json.rajaongkir?.status?.code !== 200) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `city list request failed: code ${json.rajaongkir?.status?.code}`
      )
    }
    cityCache = { fetchedAt: Date.now(), cities: json.rajaongkir.results }
    return cityCache.cities
  }

  protected matchCity_(
    cities: RajaCity[],
    city: string,
    province?: string
  ): RajaCity | null {
    const want = normalizeCity(city)
    if (!want) {
      return null
    }
    const byName = cities.filter((c) => {
      const name = normalizeCity(c.city_name)
      return name === want || name.includes(want) || want.includes(name)
    })
    if (!byName.length) {
      return null
    }
    const exact = byName.filter((c) => normalizeCity(c.city_name) === want)
    const pool = exact.length ? exact : byName
    if (province) {
      const wantProv = province.toLowerCase().trim()
      const inProvince = pool.filter(
        (c) =>
          c.province.toLowerCase().includes(wantProv) ||
          wantProv.includes(c.province.toLowerCase())
      )
      if (inProvince.length) {
        return inProvince[0]
      }
    }
    return pool[0]
  }

  protected async quoteCost_(
    svc: CourierService,
    originId: string,
    destId: string,
    weightG: number
  ): Promise<number | null> {
    const body = new URLSearchParams({
      origin: originId,
      destination: destId,
      weight: String(weightG),
      courier: svc.courier,
    })
    const res = await fetch(
      `${this.baseUrl_()}/cost?key=${encodeURIComponent(this.apiKey_())}`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    )
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `cost request failed: HTTP ${res.status}`
      )
    }
    const json = (await res.json()) as {
      rajaongkir: {
        status: { code: number }
        results: { costs: RajaCost[] }[]
      }
    }
    if (json.rajaongkir?.status?.code !== 200) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `cost request failed: code ${json.rajaongkir?.status?.code}`
      )
    }
    const costs = json.rajaongkir.results?.[0]?.costs ?? []
    if (svc.anyService) {
      const values = costs
        .flatMap((c) => c.cost ?? [])
        .map((c) => c.value)
        .filter((v) => typeof v === "number")
      return values.length ? Math.min(...values) : null
    }
    const match = costs.find(
      (c) => c.service.toUpperCase() === svc.service.toUpperCase()
    )
    const value = match?.cost?.[0]?.value
    return typeof value === "number" ? value : null
  }
}

export default RajaongkirFulfillmentProviderService

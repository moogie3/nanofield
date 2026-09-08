// Shared service catalog: built-in defaults merged with admin-managed DB
// rows. Single source for the fulfillment provider (options + quoting) and
// the admin API/UI. Server-side only — never imported by the admin bundle.

export type CourierService = {
  id: string
  courier: string
  service: string
  name: string
  // When true, quote the cheapest service this courier returns instead of
  // matching `service` exactly. Used for J&T, whose V2 service codes vary
  // by route — the option is labeled "(ekonomis)" to stay honest.
  anyService?: boolean
  // Pre-seeds start OFF: the admin enables them on the Shipping Services
  // page after confirming they quote on real lanes. Omit (or true) for the
  // default-on launch set. A DB row always overrides this flag.
  defaultEnabled?: boolean
}

export type ShippingServiceRow = {
  id: string
  code: string
  courier: string
  service_code: string
  label: string
  cheapest_match: boolean
  is_enabled: boolean
}

// Verified live Sep 8 (free tier, Jambi origin 19363):
// - Inter-city (Menteng Jakarta, 1kg): JNE REG + JTR(+bands), J&T EZ.
//   No OKE/YES on this lane — they stay pre-seed OFF until a lane proves
//   otherwise (enabling one just quotes cheapest-JNE on lanes without it).
// - Intra-city (Pakuan Baru Jambi, 1kg + 15kg): JNE CTC/CTClocal YES
//   (listed as CTCYES), JTR, J&T EZ. No REG intra-city.
// Pre-seeds let the admin toggle on what their lanes actually support.
export const BUILT_IN_SERVICES: CourierService[] = [
  { id: "jne-reg", courier: "jne", service: "REG", name: "JNE REG (2-3 hari)" },
  {
    id: "jnt-eco",
    courier: "jnt",
    service: "EZ",
    name: "J&T Express (ekonomis)",
    anyService: true,
  },
  {
    id: "jne-oke",
    courier: "jne",
    service: "OKE",
    name: "JNE OKE ekonomis (cek rute)",
    defaultEnabled: false,
  },
  {
    id: "jne-yes",
    courier: "jne",
    service: "YES",
    name: "JNE YES (cek rute)",
    defaultEnabled: false,
  },
  {
    id: "jne-ctc",
    courier: "jne",
    service: "CTC",
    name: "JNE City Courier (intra-kota)",
    defaultEnabled: false,
  },
  {
    id: "jne-ctcyes",
    courier: "jne",
    service: "CTCYES",
    name: "JNE City Courier YES (intra-kota)",
    defaultEnabled: false,
  },
  {
    id: "jne-jtr",
    courier: "jne",
    service: "JTR",
    name: "JNE Trucking (cargo)",
    defaultEnabled: false,
  },
]

const rowToService = (r: ShippingServiceRow): CourierService => ({
  id: r.code,
  courier: r.courier,
  service: r.service_code,
  name: r.label,
  ...(r.cheapest_match ? { anyService: true } : {}),
})

// DB rows win by `code` (replace or disable via is_enabled=false);
// unknown codes append as custom services. Disabled entries vanish.
export const mergeCatalog = (
  rows: ShippingServiceRow[]
): { services: CourierService[]; customCodes: Set<string> } => {
  const byCode = new Map(rows.map((r) => [r.code, r]))
  const customCodes = new Set<string>()
  const services: CourierService[] = []
  for (const base of BUILT_IN_SERVICES) {
    const row = byCode.get(base.id)
    byCode.delete(base.id)
    if (!row) {
      if (base.defaultEnabled !== false) {
        services.push(base)
      }
      continue
    }
    if (row.is_enabled) {
      services.push(rowToService(row))
    }
  }
  for (const row of byCode.values()) {
    customCodes.add(row.code)
    if (row.is_enabled) {
      services.push(rowToService(row))
    }
  }
  return { services, customCodes }
}

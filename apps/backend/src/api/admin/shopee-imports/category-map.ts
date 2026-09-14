// Phase 2 (catalog-consistency): canonical category allowlist.
// Maps a Shopee leaf name -> the ONE Nanofield category the product belongs
// to. Keys are matched case-insensitively on the trimmed leaf. A miss falls
// back to the raw leaf (status quo ante), so genuinely new Shopee leaves
// surface in Preview's categoriesToCreate for deliberate triage instead of
// silently scattering, and merch leftovers (Shirts/Pants/…) stay untouched.
//
// Others policy (explicit): KEEP "Parent Others" buckets as canonical. They
// hold 1371 live products and no bare parents exist — merging into phantom
// parents would create categories instead of collapsing them.
// Audit basis: docs/catalog-consistency-phases.md Phase 0 (Sep 12, 2026).
export const CANONICAL_CATEGORIES: string[] = [
  "Integrated Circuits",
  "Transistors",
  "MOSFETs",
  "Diodes & Rectifiers",
  "Capacitors",
  "Resistors",
  "Modules & Boards",
  "Amplifiers & Mixers",
  "Switches",
  "Electrical Circuitry & Parts Others",
  "Electronics Others",
  "CCTV Security Cameras",
  "Home Appliances Others",
  "Small Household Appliances Others",
  "TVs & Accessories Others",
  "Washing Machines & Dryers Others",
  "Kitchen Appliances Others",
  "Audio Others",
  "Tools Others",
  "Remote Controls",
  "Electricity Savers",
  "Power Welding Tools",
  "TV Antennas",
  "Lighting",
  "Pliers",
  "Juicers, Blenders & Soya Bean Machines",
  "Batteries & Accessories",
  "Industrial Adhesives & Tapes",
  "Books Others",
]

// Raw Shopee leaf (lowercased + trimmed) -> canonical exact live name.
// Canonical names themselves need no entry: unmapped leaves pass through,
// which keeps them exactly as the live rows ensureCategory() already holds.
const LEAF_MAP: Record<string, string> = {
  // Duplicate pair: one bucket.
  batteries: "Batteries & Accessories",
  // Test/bench gear belongs with tools, not circuitry.
  "electrical testers & multimeters": "Tools Others",
  "water pumps, parts & accessories": "Tools Others",
  // Audio tail folds into Audio Others.
  "home audio & speakers others": "Audio Others",
  "mp3 & mp4 players": "Audio Others",
  // Connectivity/power tail folds into the circuitry bucket.
  "audio & video cables & converters": "Electrical Circuitry & Parts Others",
  "laptop chargers & adaptors": "Electrical Circuitry & Parts Others",
  "cables, chargers & converters others": "Electrical Circuitry & Parts Others",
  "network cables & connectors": "Electrical Circuitry & Parts Others",
  "power supply units": "Electrical Circuitry & Parts Others",
  "electrical safety": "Electrical Circuitry & Parts Others",
  "cooling others": "Electrical Circuitry & Parts Others",
  "fans & heatsinks": "Electrical Circuitry & Parts Others",
  "electric sockets & extension cords": "Electrical Circuitry & Parts Others",
  // Small-electronics strays fold into Electronics Others.
  "science & tech toys": "Electronics Others",
  "ignition others": "Electronics Others",
  "sim cards": "Electronics Others",
  // Surveillance tail folds into the kept CCTV bucket.
  "security cameras & systems others": "CCTV Security Cameras",
  // Appliance strays fold into their parent Others buckets.
  "tv boxes & receivers": "TVs & Accessories Others",
  "rice cookers": "Small Household Appliances Others",
  "irons & steamers": "Small Household Appliances Others",
  "camping lamps & flashlights": "Lighting",
  "lighters, matches & fire starters": "Home Appliances Others",
  straws: "Home Appliances Others",
  "measuring glasses & spoons": "Home Appliances Others",
  "storage boxes, bags & baskets": "Home Appliances Others",
  "hair removal tools": "Home Appliances Others",
}

const leafKey = (leaf: string | null | undefined): string | null => {
  if (typeof leaf !== "string") {
    return null
  }
  const key = leaf.trim().toLowerCase()
  return key || null
}

// Canonical category for a raw Shopee leaf, or null when the leaf is not
// mapped (caller falls back to the raw leaf — never to a guess).
export const canonicalCategory = (
  leaf: string | null | undefined
): string | null => {
  const key = leafKey(leaf)
  if (!key) {
    return null
  }
  return LEAF_MAP[key] ?? null
}

export const isCanonicalCategory = (name: string | null | undefined): boolean => {
  const key = leafKey(name)
  if (!key) {
    return false
  }
  return CANONICAL_CATEGORIES.some((c) => c.toLowerCase() === key)
}

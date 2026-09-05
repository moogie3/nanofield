# Nanofield — Standalone Ecommerce Plan
*Last updated: September 4, 2026 (v5) — synced to committed `main` (`6f3da02`): demo seed scripts, Nanofield branding, shadcn set, spec/datasheet tabs*

> **Decision history, for context:** v1 recommended Medusa. v2 briefly moved to Payload CMS on the reasoning that checkout was being fully custom-built anyway, so Medusa's commerce engine bought less than it looked like. v3 reverses back to Medusa, because the store's stated goal is B2C-first with **B2B as a near-future possibility, not a current requirement** — and Medusa's B2B modules (customer groups, price lists, company accounts, quotes) are dormant/free until used, while Payload has none of that scaffolding and would require building B2B commerce logic from scratch later. v4 renamed to Nanofield, confirmed backend decision unchanged. v5 (this version) is a sync to what is actually committed on `main` — no decision change.

## 0. Build progress so far
- [x] Postgres and Redis installed locally (Windows); `nanofield` database created
- [x] Medusa backend scaffolded (`npx create-medusa-app`, project name `nanofield`) with the Next.js Starter Storefront installed alongside it
- [x] Medusa Admin dashboard confirmed working at `localhost:9000/app` (after clearing a stale Vite dependency cache that caused a blank-page/React-child error on first load)
- [x] Storefront confirmed working at `localhost:8000/dk/store`, correctly rendering Medusa's seed data (placeholder products — real catalog import still pending, see Section 7)
- [x] shadcn/ui initialized on the storefront (CLI v4, Base UI primitives). Worked around a known shadcn CLI bug where Tailwind v3 monorepo projects were misreported as "no Tailwind config found" (fixed by re-running `init` with the existing `components.json` overwritten). Committed set under `apps/storefront/src/components/ui/`: `accordion, alert, avatar, badge, breadcrumb, button, card, carousel, chart, dialog, dropdown-menu, input, label, select, separator, skeleton, tabs, tooltip`. Import path normalized from `src/@/...` to `src/components/...` + `src/lib/utils.ts` (`tsconfig.json` updated, old `src/@/components/ui/button.tsx` removed)
- [x] Preset font rendering resolved: root `apps/storefront/src/app/layout.tsx` now loads `Outfit` (`--font-sans`) + `Manrope` (`--font-heading`), wraps in `ThemeProvider` + `TooltipProvider`, sets Nanofield title/description metadata. `src/styles/globals.css` forces Medusa `ui-preset` classes (`txt-*`, `text-*`, `h1-*`…`h4-*`) onto `var(--font-sans)` / `var(--font-heading)`, so the nested `[countryCode]/(main)/layout.tsx` inherits correctly. Includes light/dark `oklch` tokens + 0.5s theme transition
- [x] Real admin user exists (`admin@test.com` / `supersecret` — used by the committed seed scripts; rotate before any shared/staging deploy). `probe-admin.mjs` + `seed-semiconductors.mjs` both log in via `/auth/user/emailpass`
- [x] Backend tooling scripts committed (`apps/backend/probe-admin.mjs`, `apps/backend/seed-semiconductors.mjs`):
  - `probe-admin.mjs` — read-only probe for sales-channels, stock-locations, shipping-profiles, regions, product-categories, products
  - `seed-semiconductors.mjs` — idempotent demo seeder (skips existing handles): 7 categories (`Integrated Circuits, Transistors, MOSFETs, Capacitors, Resistors, Diodes & Rectifiers, Modules & Boards`), 12 products (e.g. `NE555P IC-0399`, `LM7805 IC-0401`, `2N2222 TRS-0051`, `IRF540N MOS-0117`, `ESP32-WROOM-32 MOD-0501`), each with `metadata = { part_number, manufacturer, package_case, mounting_type, operating_temp, voltage_rating?, current_rating?, is_semiconductor: true, rohs: "true", lead_free: "true" }`, single `Part: Default` option/variant, `stocked_quantity: 500` at the default location
  - Known placeholder: seed prices are `eur`/`usd` cent amounts (`1–13`), not IDR. Replace with IDR region pricing in the real import
- [x] Nanofield branding committed: `nav` shows `Nanofield` wordmark, new `nav-icons` + `sticky-nav` (transparent → 70% `color-mix` blur + shadow on scroll), `hero` with `public/background.jpeg` + `public/nanofield.jpg` logo, headline "Precision Electronic Components & Appliance Spare Parts", `Enter Catalog` CTA. Root metadata: "Nanofield | Precision Electronic Components"
- [x] Component-spec storefront pattern proven (maps to Section 7 metadata plan): `product-tabs` renders `Specifications` (part number, manufacturer, package/case, mounting, temp, V/A/W, RoHS/lead-free, dims, MSL, ESD — empty values filtered), `Datasheet & Compliance` (datasheet/app-note/CAD links, `alldatasheet.com` fallback by part number, RoHS/REACH/lead/halogen/MSL/ESD/UL/origin badges, cross-reference badges; hidden when `metadata.is_semiconductor === false`), `Shipping & Returns`
- [x] Catalog browsing upgrades committed: `product-preview` grid + list layouts showing `metadata.part_number` (fallback variant SKU/handle), hover zoom, `hover-preview`, `quick-add` (Hugeicons `PlusSign` → `Tick02`, calls `addToCart`), `refinement-list/view-toggle` (grid/list via query param), `paginated-products` + `store` template wired for layout switching
- [x] Theming/dark-mode pass committed: `next-themes` `ThemeProvider`, `theme-toggle`, `globals.css` dark `.dark` tokens, migrated cart/checkout/account/order/skeleton/category/shipping/discount/payment/review/cart-totals/divider/filter-radio/modal/cart-dropdown/country-select/language-select/side-menu/mobile-actions/related-products/free-shipping-nudge components off hardcoded Medusa colors onto `bg-card/border-border/text-foreground/muted` tokens. New `GET /api/categories` route (`listCategories({ limit: 200 })`) for nav/category consumers
- [ ] Still pending: real catalog import (879 products / 990 SKUs + un-uploaded remainder) from the Shopee mass-update Excel export — demo seed is 12 SKUs only and must not be confused with the real import
- [ ] Still pending: resolve Section 6 data issues (1 SKU collision, 6 price mismatches, 2 duplicates, 38+6 platform gaps)
- [ ] Still pending: Midtrans provider, Meilisearch, R2, RajaOngkir, hosting decision, PSE check (see Section 7)

## 1. Why this store exists
Moving off Shopee due to rising platform fees. This will be a standalone brand store — not a marketplace clone — for an Indonesia-based semiconductor/electronics-component and appliance-spare-part retailer, currently listed on Shopee and TikTok Shop under the Toko Sanjaya name, being relaunched as the standalone brand **Nanofield**.

## 2. Decision log

| Decision | Choice | Why |
|---|---|---|
| Frontend | Next.js, fully custom UI (no template) | Checkout and every page will be redesigned from scratch regardless of backend, so template fidelity isn't a factor |
| Backend / admin | **Medusa** (final — see decision history above) | Native B2B modules (customer groups, price lists, company accounts, quotes) are dormant/free if unused now, and ready if B2B becomes real later. No CMS (Payload or otherwise) needed — the storefront is a stateless Next.js app calling Medusa's API directly |
| Business model | B2C primary, B2B held in reserve | Launch B2C-only; enable Medusa's B2B modules later without an architecture change |
| Search | Meilisearch | Free, self-hosted, typo-tolerant — matters for part-number search and mixed ID/EN product names |
| Payment | Midtrans, custom integration | Native GoPay + QRIS (OVO/DANA/ShopeePay/LinkAja) coverage, no subscription fee, official Node SDK |
| Shipping/tracking | RajaOngkir API | Covers cost calculation + AWB tracking on one free-tier key |
| File/image storage | Cloudflare R2 | S3-compatible, free egress — matters for datasheet PDFs + multi-image listings |
| Hosting | Self-managed VPS (Hetzner/Vultr Singapore, or Biznet Gio if IDR billing/local support is preferred) | User manages own deploys/backups already; flat-rate VPS is cheaper than usage-billed PaaS (Railway) at sustained load |
| Database | Postgres (Medusa default) | — |

## 3. Why Medusa (final) — and why not Payload, and why not the hybrid

**Why not Payload alone:** Payload's own ecommerce plugin is beta, Stripe-only, single-tier retail cart/checkout — no B2B provisions at all. Since B2B is a real near-future goal, building customer groups, tiered pricing, and approval workflows on top of Payload would mean writing all of that from scratch later. Medusa ships it as standard API resources today, unused until switched on.

**Why not Payload as a pure "frontend-only" layer:** Payload cannot be database-less — it's a CMS with an admin panel, and that panel always needs its own Postgres/Mongo DB to persist whatever you define in it, even when paired with Medusa. What was actually wanted — one system (Medusa) holding all data, with a stateless app just rendering products and handling checkout, deployable free on Vercel — doesn't need Payload at all. That's exactly what a plain Next.js storefront calling Medusa's Store API directly already is (Medusa's own official Next.js Starter Storefront works this way): no second database, no CMS layer, nothing but the frontend.

**Why not the Medusa+Payload hybrid:** This is a real, officially documented pattern — Medusa owns commerce data (products, pricing, cart, checkout), Payload owns editorial content (blog, landing pages, banners), linked via Medusa's module-link feature. It fits teams with a content team publishing marketing pages independently from the commerce backend. Not this case: solo dev, catalog-first store, no separate content team or marketing-content roadmap. Running two backend services (Medusa + Payload, two Postgres DBs, two deploy pipelines) buys a workflow benefit that isn't currently needed. If a real content need shows up later (blog, campaigns), it can be built inside Medusa's own admin or added then — no need to pre-pay for it now.

**Net effect:** custom component/spec fields (manufacturer, datasheet, source, obtainment method — the BomTrace-style reference) are still fully doable in Medusa via its metadata fields plus custom admin widgets. More setup than Payload's native collections would have been, but far less than rebuilding B2B commerce logic from zero later. The committed `seed-semiconductors.mjs` + `product-tabs` already prove the pattern: spec/compliance metadata in, spec/datasheet UI out.

## 4. Speed checklist (backend-independent — protected regardless of Medusa vs. any alternative)
Speed is a frontend/infra decision, not a backend decision — these apply identically no matter what's behind the API:
- Next.js with ISR/SSG on product and category pages — nothing rendered fresh per request
- Meilisearch in front of the catalog — sub-10ms search/filter at this catalog size
- Product images + datasheet PDFs through Cloudflare R2 behind a CDN, served as WebP/AVIF
- Edge caching (Vercel or Cloudflare) for pages and API responses
- Virtualized/paginated product lists — never rendering all 900+ items into the DOM at once
- Target: Core Web Vitals "good" thresholds — LCP < 2.5s, INP < 200ms, CLS < 0.1 at 75th percentile (test with PageSpeed Insights on staging)

## 5. Catalog snapshot (from Stock Guide + latest Shopee mass-update export)

- **879 products / 990 SKUs** (including per-variation SKUs), 34 categories, tracked across Shopee and TikTok Shop as of the July 28, 2026 reconciliation.
- Latest Shopee mass-update export (`mass_update_sales_info_1182502206_20260901095521.xlsx`) confirms **1,000 SKU rows** with live price and stock — this is the authoritative source for actual price/stock numbers (the Stock Guide only had example prices).
- **Not all inventory is on Shopee/TikTok yet** — user has confirmed there's additional stock never uploaded to either platform. Scale beyond 990 SKUs is still unknown; doesn't change the architecture (Postgres + Meilisearch don't care whether it's 990 or 5,000+), but should be factored into the import plan once available.
- Demo seed on `main` is **12 SKUs / 7 categories only** (`seed-semiconductors.mjs`) — useful for proving the metadata → UI path, not a substitute for the real import.

### Top categories by volume
| Prefix | Category | Qty | % of stock |
|---|---|---|---|
| IC | Integrated Circuit | 395 | 44.9% |
| TRS | Transistor | 158 | 18.0% |
| FLY | Flyback | 62 | 7.1% |
| MOS | Mosfet | 36 | 4.1% |
| CAP | Capacitor | 32 | 3.6% |
| TL | Hand Tool | 21 | 2.4% |
| RMT | Remote Control | 17 | 1.9% |
| MISC | Other Spare Part | 16 | 1.8% |
| ...+ 26 more smaller categories | | | |

IC + Transistor + Flyback + Mosfet = **74% of the catalog** — heavily TV/audio repair-parts weighted, with a long tail of appliance spare parts, tools, and accessories.

### SKU scheme (maps directly to Medusa product + variant + metadata)
`PREFIX-NNNN` for single-variation products, `PREFIX-NNNN-LETTER` for variations (e.g. `FUS-0003-A` through `-F`). Maps onto a Medusa `Product` with related `Variant`s keyed by `sku`, plus spec fields in `metadata` (`part_number, manufacturer, package_case, mounting_type, operating_temp, voltage_rating, current_rating, is_semiconductor, rohs, lead_free, datasheet_url, ...`) as proven by the committed seed + `product-tabs`. Close to mechanical to migrate.

## 6. Data issues to resolve before import
Carried over from Stock Guide Section 7 (as of July 28, 2026 reconciliation) — fix these before they go into Medusa, since importing them as-is will create bad data:

- **1 open SKU collision:** `TRS-0051` is used by two different TikTok listings. Recommend moving "...Amplifier" listing to a new code `TRS-0162`, leaving `TRS-0051` with the listing that matches Shopee. Note: the demo seed already uses `TRS-0051` for `2N2222 NPN Transistor` — keep the demo SKU distinct from the final resolved code to avoid a handle collision on re-import.
- **6 open price mismatches** between TikTok/Shopee needing manual review: `ADP-0005-B`, `BAT-0001-A`, `BAT-0001-B` (looks like a swap), `DWM-0001`, `DWM-0002`, `MISC-0005-E`.
- **2 unmerged duplicate listings:** `RMT-0008`/`RMT-0012` (TikTok, both Rp65,000) and `WMP-0001`/`WMP-0003` (Shopee, both Rp15,000) — decide whether to merge before import.
- **Platform gaps:** 38 Shopee-only products with no TikTok listing, 6 TikTok-only products with no Shopee listing (`IC-0399–0402`, `FUS-0008`, `MOS-0036`) — decide whether the new store's catalog is the union of both or one platform's list. Note: demo seed reuses `IC-0399/IC-0401` handles for `NE555P/LM7805` — rename or drop demo products before the real import if the TikTok-only `IC-0399–0402` range is kept.
- **Informational, not urgent:** 5 zero-stock Flyback SKUs appear correctly as zero across platforms; `FLY-0027` disappeared from both platforms and may have been removed unintentionally — worth a quick check.

## 7. Open items / next steps
- [ ] Get the un-uploaded remainder of inventory (beyond the 990 SKUs already on Shopee/TikTok) to size the full catalog
- [ ] Resolve the SKU collision, 6 price mismatches, 2 duplicates, and decide the platform-gap merge strategy above (watch demo-seed handle collisions: `TRS-0051`, `IC-0399`, `IC-0401`)
- [x] Draft Medusa product/variant data model + metadata schema for component specs — DONE as demo: `part_number, manufacturer, package_case, mounting_type, operating_temp, voltage_rating, current_rating, is_semiconductor, rohs, lead_free` (+ `datasheet_url, application_note_url, cad_model_url, cross_references, reach, halogen_free, msl, esd_rating` consumed by `product-tabs`). Still to do: Manufacturer/Source/Obtainment-Method/Serial-Number mapping to Stock Guide categories, plus any custom admin widgets needed to browse/filter them BomTrace-style
- [ ] Build the real import script from the mass-update Excel export into Medusa (Admin API or seed script, IDR pricing, real stock — replaces the 12-SKU `seed-semiconductors.mjs` demo, which uses EUR/USD placeholder prices and flat `500` stock)
- [ ] Rotate `admin@test.com / supersecret` before any shared env; add `MEDUSA_BACKEND_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` handling to deployment notes
- [ ] Launch B2C-only; revisit enabling Medusa's B2B modules (customer groups, price lists, company accounts, quotes) once/if B2B demand is real
- [ ] Custom Midtrans payment provider integration (Next.js API routes)
- [ ] Meilisearch + R2 + RajaOngkir integrations (all decided, none started)
- [ ] Decide final hosting: Hetzner/Vultr Singapore vs Biznet Gio (IDR billing/local support) vs Railway (managed, usage-billed)
- [ ] Flag: PSE (Kominfo electronic system provider) registration may apply to running a commercial platform in Indonesia, independent of where it's hosted — worth checking with an accountant/lawyer, not a hosting decision
- [ ] Housekeeping: `nanofield_ecommerce_plan.md` is still untracked (`git status` shows `??`) — `git add` + commit it so v5 is on `main` alongside the code it describes; consider moving the one-off `probe-admin.mjs` / `seed-semiconductors.mjs` scripts into a documented `apps/backend/scripts/` folder with usage in `README`

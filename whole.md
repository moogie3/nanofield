# Nanofield — Whole-Project State
*Last updated: September 6, 2026. Companion docs: `nanofield_ecommerce_plan.md` (business/catalog plan), `AGENTS.md` (commands + conventions).*

## Objective
Standalone brand store for an Indonesia-based semiconductor / electronic-component and appliance-spare-part retailer (ex-Shopee/TikTok "Toko Sanjaya"), relaunched as **Nanofield**. B2C first; B2B held in reserve via Medusa's dormant B2B modules.

## Layout
- `apps/backend` (`@nanofield/backend`) — Medusa v2 app. API at `http://localhost:9000`, admin at `/app`. Node 20+, PostgreSQL 15+.
- `apps/storefront` — Next.js storefront. `http://localhost:8000`, default region `dk`.
- Package manager for this install is **npm** (`package-lock.json` at root). Never introduce a second lockfile. Install deps inside the app that needs them (`cd apps/backend` / `cd apps/storefront`).
- Turborepo at root: `npm run dev | build | start | lint | test`.

## Storefront — what is built
- **Hero**: one unified schematic scene (`HeroSchematic`, `modules/home/components/hero/index.tsx`) — power block, MCU, ADC/sensor, motor driver, comms, relay output; orthogonal nets with junction dots; inline diode/Zener/LED/MOSFET/NPN/relay/switch symbols. Eleven glowing signal pulses travel the power, bus, motor-loop, comms, and relay nets (`hero-pulse` / `-2` / `-3` overlays, `pathLength=100` dash-flow; hidden under `prefers-reduced-motion`); via dots are vivid green (`#00e676` with matching glow) and keep their staggered blink. Draggable overlay symbols are a separate layer (`DraggableSymbol`, positions persist to localStorage). CSS classes `hero-tr` / `hero-via` / `hero-pulse*` / `hero-spin-slow` / `hero-via-blink` live in `styles/globals.css`. Known pre-existing lint note: `<a href="/store/">` in hero — leave it.
- **Catalog** (`modules/store`): sort, grid/list view toggle, category checkbox filter with "All products" reset. Filter state lives in the `?category=` URL param (`store/page.tsx` parses it). Reset pushes the bare path + `router.refresh()`; the grid remounts via a filter-signature `key` on the `<Suspense>` boundary; empty results render an explicit "No products match" panel with a "Show all products" link.
- **Catalog caching**: products/categories fetches use `force-cache` + `revalidate: 300` (5-min ISR). After deleting products/categories in the admin, **restart the storefront dev server once** to flush stale entries immediately.
- **Product pages**: transparent default product image with `size` prop (`xs|sm|md|lg|card`); gallery carousel with arrows/dots/counter; shared datasheet util (`lib/util/product-datasheet.ts`: `no_datasheet` opt-out → direct `datasheet_url` (any category) → `is_semiconductor=false` hides → `mpn`/`datasheet_search`/`part_number` search fallback; title is never used so hand tools/merch get no button) + `DatasheetButton` under the image ("View datasheet" direct vs "Find datasheet" search).
- **Cart**: optimistic `QuantityStepper` on cart page + cart dropdown; hover preview is viewport-clamped and hidden on mobile.
- Fonts Outfit (body) + Manrope (headings); teal primary `#0E7C8C`.

## Backend — what is built
- **Admin branding** (`src/admin/lib/brand-dom.ts` + `widgets/branding.tsx` + `widgets/login-branding.tsx`): login circuit backdrop (22-trace board, 14 glyph types, 39+ spinning floaters, blinking vias), topbar badge, sidebar avatar blobs, favicon, Outfit+Manrope, static-copy scrubber (hides Docs/Changelog, rewrites Medusa strings; re-runs on click/focusin/popstate).
- **Admin routes**: `/app/overview` (Nanofield home, rank 1), `/app/ecomm-import` (E-comm Import, rank 2, `ArrowUpTray` icon; `@medusajs/icons@2.19.0` added).
- **Product datasheet widget** on `product.details.side` (toggle + URL + MPN). Datasheet UI rule (storefront `getDatasheetInfo`, shared by button + tabs): `no_datasheet` opt-out → direct `datasheet_url` (any product) → search fallback ONLY when `is_semiconductor` is explicitly true plus an identifier; title never used. The importer sets `part_number` + `is_semiconductor` from the SKU prefix (`classifySku`: IC/TRS/MOS/DIO/CAP/RES/IND/FUS/XTL/CRY/LED → true, everything else false).
- **Shopee importer**: thin CLI (`import-shopee.mjs`) calling Admin API routes (`src/api/admin/shopee-imports/`: `preview`, `execute`, `jobs`, `jobs/[id]`), shared engine (`engine.ts`), in-memory job store, multer middleware (`src/api/middlewares.ts`, 8MB). Dry-run verified: 880 products, 0 errors. Real execution still pending.
- `.gitignore` ignores `*.xlsx` at root. Never commit/print `.env` secrets. Never hand-edit migrations that may have run — add new ones.

## Data status (Sep 6, 2026)
- Live catalog (verified Sep 6 via Store API: 1212 products, 8 categories): 12-SKU semiconductor demo seed + ~1200 `lt-XXXX` loadtest placeholders. Fashion products and Shirts/Pants/Sweatshirts categories are deleted in the backend; if the storefront still shows them, its dev server predates the cache fixes — restart it.
- Real import source: Shopee mass-update Excel exports at repo root. Open data issues before import: 1 SKU collision (`TRS-0051`), 6 price mismatches, 2 duplicate listings, platform-gap merge decision, demo-seed handle collisions (`TRS-0051`, `IC-0399/0401`) — see plan Section 6.
- Cleanup required before/with real import: remove loadtest + merch + demo-seed products, resolve collisions, switch to IDR pricing.

## Gotchas
- Catalog cache: 5-min ISR on products/categories. Product AND category create/update/delete auto-purge the storefront via the `revalidate-storefront` subscriber → `POST /api/catalog/revalidate` (literal event strings — the `ProductEvents.*` constants have a prefix mismatch and don't fire for categories). Requires `STOREFRONT_URL` + matching `REVALIDATE_SECRET` in both env files (configured Sep 6). Restarting the storefront dev server flushes everything.
- Integration tests need a live PostgreSQL. No destructive DB commands without explicit confirmation.
- Backend must satisfy `@medusajs/eslint-plugin` recommended config — never disable a `@medusajs/*` rule; fix the code.
- `apps/storefront` lint currently ignore-patterns `src` files; `tsc --noEmit` has pre-existing project-wide React-type (TS2786) noise — when verifying, filter output to the files you touched.
- VSCode `@tailwind`/`@apply` "unknown at rule" warnings are editor-only noise, silenced via `.vscode/settings.json`. The Tailwind build is unaffected.

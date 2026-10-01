# Nanofield — Interview Q&A

*Defensive asset: ~35 questions an interviewer (or a new teammate, or future-you) would ask about this codebase, each answered in 3–5 sentences with a file pointer and the lesson. Rule: answers stay short and anchored to paths — never paste code inline, or entries rot. Last reviewed: October 1, 2026.*

## 1. Architecture

**Q: Why Medusa instead of building custom or using something like Payload CMS?**
A: The store is B2C-first with B2B as a near-future possibility, not a current requirement. Medusa's B2B modules (customer groups, price lists, company accounts, quotes) are dormant and free until used, while a CMS like Payload has none of that scaffolding and would force building commerce logic from scratch later. So Medusa buys the commerce engine; only the gaps get custom code.
Pointers: `docs/nanofield_ecommerce_plan.md` (decision history v1–v9), `docs/STARTING_MANUAL.md` (Dormant section).

**Q: How do the backend and storefront talk to each other?**
A: They are separate processes in one Turborepo: Medusa API on `:9000`, Next.js on `:8000`, one Postgres. The storefront is stateless — every page renders from Medusa Store API calls scoped by a publishable key, with force-cache + tag revalidation and a `POST /api/catalog/revalidate` purge hook. If the backend dies, every storefront page 500s — proven twice.
Pointers: `docs/ARCHITECTURE.md` §1, `apps/storefront/src/lib/data/*`, `apps/storefront/src/app/api/catalog/revalidate/route.ts`.

**Q: Why Postgres full-text + trigram search instead of Meilisearch/Algolia?**
A: One less infrastructure dependency for a catalog where exact-identifier matching matters more than fuzzy prose search. The backend `/store/search` ranks exact SKU/part_number/MPN/option-value/handle first, then title substring, spec metadata, trigram similarity, and tsvector rank — typo-tolerant, zero new infra, needs only the `pg_trgm` extension.
Pointers: `apps/backend/src/api/store/search/route.ts`, `docs/catalog-consistency-phases.md`.

**Q: Why Railway backend + Vercel storefront for hosting?**
A: The backend needs Docker (custom providers, volume for `/static` uploads, Postgres plugin, Redis plugin); the storefront is a stateless Next.js app that maps cleanly onto Vercel. PSE registration and the Midtrans/RajaOngkir/Resend live-key flips are tracked as go-live items, not code changes.
Pointers: `DEPLOY.md`, `docs/whole.md` (item 17).

**Q: What's the single most important operational rule?**
A: Order matters more than values: nearly every fresh-clone shipping failure is a prerequisite created out of sequence (region before currency, option before fulfillment set, unlinked location). The manual's Parts A–H run top to bottom, each with a Verify statement, and two Definition-of-Ready gates block import and launch.
Pointers: `docs/STARTING_MANUAL.md` (Topic index, Parts D–E).

## 2. Backend modules (custom vs core)

**Q: What's your rule for building custom vs using Medusa built-ins?**
A: Custom code exists only where core has no equivalent — engines stay core, project layers sit on top. RBAC tiers are data on the core RBAC engine; feed/email are channels on the core notification module; RajaOngkir quotes use the fulfillment provider interface beside the retained manual provider. Returns, promotions, price lists, gift cards, Translations, Workflows, and CSV import are core-driven or dormant — never reimplemented.
Pointers: `docs/STARTING_MANUAL.md` (Topic index rule), `docs/ARCHITECTURE.md`.

**Q: Walk me through a custom module — say the banner system.**
A: A `banner` DML module (type/title/description/link/image_url/dates/is_published) with admin CRUD plus a storefront read endpoint serving only live rows. Announcement broadcasts twin as homepage strips; image uploads land in the backend `/static` volume with only relative paths persisted (absolute URLs would leak origins; Windows backslashes are healed at read). Nothing is ever deleted — unpublish hides, expired rows stay as history.
Pointers: `apps/backend/src/modules/banner/*`, `apps/backend/src/api/admin/banners/*`, `apps/backend/src/api/store/banners/*`.

**Q: Why split `rajaongkir` and `rajaongkir-fulfillment` instead of one module?**
A: They answer different questions: the catalog module owns service *data* (which courier services exist, enabled flags, custom services with built-ins protected from deletion), while the fulfillment module is a `ModuleProvider` that *executes* (live quotes, fulfillment stamping, tracking). Data vs execution is the standard Medusa split — merging them would tangle admin CRUD with quote logic.
Pointers: `apps/backend/src/modules/rajaongkir/*`, `apps/backend/src/modules/rajaongkir-fulfillment/*`.

**Q: How did the RBAC tier bootstrap actually work, given module loaders can't see the global container?**
A: That was the core fight: module loaders receive a module-scoped container, so `rbacModuleService` isn't resolvable there. The fix moved bootstrapping into an `onApplicationStart` hook on the service itself, resolving RBAC first from declared container dependencies, then from `MedusaModule.getModuleInstance` as fallback. Along the way we learned `Module()` silently drops `dependencies` (only the `medusa-config.ts` entry forwards them) and that the engine checks the `*:*` policy — custom wildcard policies don't match.
Pointers: `apps/backend/src/modules/audit-log/service.ts`, `apps/backend/medusa-config.ts`.

**Q: Why does Staff use an explicitly empty role instead of just having no role?**
A: Because core `hasPermission` fail-opens for users with no roles. An absent role would silently grant access; a present-but-policy-less Staff role is explicitly denied. The `team-activity` subscriber auto-assigns tiers on invite acceptance precisely so nobody is ever role-less.
Pointers: `apps/backend/src/subscribers/team-activity.ts`, `docs/STARTING_MANUAL.md` (J.3 Users).

**Q: How do email notifications avoid double-sending across environments?**
A: Exactly one email provider is ever registered — Resend in production, Mailtrap sandbox in dev — chosen by which credentials exist, enforced by conditional registration in `medusa-config.ts`. Both must declare `channels: ["email"]` because the notification module assigns no defaults (without it, sends fail silently). The shared template file feeds both providers, so copy changes once.
Pointers: `apps/backend/medusa-config.ts`, `apps/backend/src/modules/resend-notification/templates.ts`.

**Q: Why a separate sender-profile module instead of env vars?**
A: Env vars were the original source (`STORE_*`), but operators needed to fix the Pengirim block on shipping labels without deploys. The module is a singleton row the admin page edits; the receipt route prefers the row and falls back to env. Same pattern as the service catalog: data the business edits lives in the database, not the environment.
Pointers: `apps/backend/src/modules/sender-profile/*`, `apps/backend/src/api/admin/orders/[id]/receipt/*`.

**Q: What guards the Shopee importer against bad runs?**
A: Preview-before-execute with a formal Gate 1 sign-off, idempotency by `shopee_product_id` (re-imports update in place, zero new option values on identical files), dry-run defaults on all backfills, and a catalog-consistency contract (canonical category allowlist, anchored spec matching, monotonic `has_datasheet`). The engine never overwrites what the files don't supply — a weights-only refresh is sales + ship, leaving descriptions and galleries untouched.
Pointers: `apps/backend/src/api/admin/shopee-imports/*`, `docs/catalog-consistency-phases.md`.

## 3. Commerce flows

**Q: Trace a checkout end to end.**
A: Cart (region prices) → address (city/province feed the RajaOngkir destination lookup) → delivery step (location-to-channel, zone-to-geo-zone, option-to-provider-to-live-quote, summed variant weights) → payment (`pp_system_default` today; Midtrans cutover is a go-live flip) → order with a fulfillment record stamped `{ courier, service, manual_booking: true }` (AWB booked manually outside the system). Any empty step traces back to exactly one Part F item.
Pointers: `docs/STARTING_MANUAL.md` (D.20, Part H), `apps/backend/src/modules/rajaongkir-fulfillment/service.ts`.

**Q: Why does checkout never block even when RajaOngkir is down?**
A: The provider never throws — any failure returns the flat `RAJAONGKIR_FALLBACK_AMOUNT` (Rp 20.000) so quoting degrades to placeholders instead of erroring. Operators distinguish live from fallback by testing two lanes (a single lane can't tell them apart — that's a manual verification step, not just docs).
Pointers: `apps/backend/src/modules/rajaongkir-fulfillment/service.ts`, `docs/STARTING_MANUAL.md` (Part H).

**Q: How did you verify live quotes vs fallback?**
A: Against real lanes: Jambi→Menteng 1kg returned JNE REG 26.000 + J&T EZ 22.000; intra-Jambi 500g returned City Courier 10.000 + J&T EZ 8.000. Exact-service options never borrow another service's price — a lone Rp 20.000 among live quotes means that service doesn't exist on the lane (JNE REG has no intra-city service), not a bug.
Pointers: `docs/whole.md` (RajaOngkir bullets), `docs/STARTING_MANUAL.md` (Part H).

**Q: How does Midtrans Snap integrate?**
A: A `midtrans-payment` provider module: Snap `createTransaction`, status mapping (capture/settlement → captured), signed webhook driving session actions, challenge approval, refund/cancel/expire. The storefront return landing (`/order/confirmed`) completes the cart once Midtrans reports settlement; sandbox captures verified end to end. Sandbox keys first, `MIDTRANS_IS_PRODUCTION` flips only at go-live with the notification URL registered per environment.
Pointers: `apps/backend/src/modules/midtrans-payment/*`, `apps/storefront/src/modules/order/components/midtrans-return/*`.

**Q: Why is cargo gated by weight, and why only as merchandising?**
A: JNE JTR and friends only make sense above ~10kg — showing them on a 200g cart invites misquotes and support tickets. The storefront hides them below `NEXT_PUBLIC_CARGO_MIN_WEIGHT_G` with an "unlocks above X kg" hint, but the server still quotes if selected: it's merchandising, not a security boundary, and the code says so.
Pointers: `apps/storefront/src/modules/checkout/components/shipping/index.tsx`.

**Q: How does the manual pickup option work?**
A: A `pickup`-type fulfillment set + zone + free flat option on the manual provider (seed step 12, idempotent), split out of delivery options by set type in the checkout UI. This is also why the built-in manual provider is retained rather than replaced.
Pointers: `apps/backend/scripts/seed-nanofield-shipping.mjs`, `apps/storefront/src/modules/checkout/components/shipping/index.tsx`.

**Q: What happens after an order ships?**
A: `tracking-sync` polls Komerce AWB tracking for shipped-but-undelivered fulfillments (oldest-first, 5/run cap, 6h minimum age — sharing the 100 hits/day quota with checkout quotes) and runs the core delivery workflow on courier POD confirmation; the storefront card flips to Delivered plus a bell note. Entering the AWB stays manual; everything after is automatic.
Pointers: `apps/backend/src/jobs/tracking-sync.ts`.

## 4. Data integrity

**Q: How do you keep 1000 imported products consistent?**
A: A checked-in contract, not conventions in people's heads: variation values normalized at plan time (case preserved), categories resolved through a 29-entry canonical allowlist with raw paths kept as `category_path`, variant labels deriving `spec_*` facts plus a monotonic `has_datasheet` flag, strict anchored spec matching, family-gated derivation. A backfill script brings legacy rows onto the same contract dry-run-first.
Pointers: `docs/catalog-consistency-phases.md`, `apps/backend/scripts/backfill-catalog-consistency.ts`.

**Q: What's the one deletion you must never do?**
A: Delete a stock location holding inventory — it orphans every level (the "all stock zero" outage) and re-linking a deleted location crashed every page for cart-cookie holders (September 9). Levels move first, old location removed after, deleted rows never re-linked. This is a recorded incident, not advice.
Pointers: `docs/STARTING_MANUAL.md` (Part K), `docs/whole.md` (Sep 8–9 outages).

**Q: How are migrations disciplined?**
A: Never hand-edit a migration that may already have run — add a new one via `db:generate`. The seed itself runs once through `script_migrations` (`initial-data-seed`), and `medusa develop` applies pending module migrations on boot (proven, but the admin UI hot-reloads separately, so new admin pages need a real backend restart).
Pointers: `docs/STARTING_MANUAL.md` (Parts C, K).

**Q: How is stock truth derived?**
A: `stocked_quantity` per location is the source of truth; availability is stocked minus reserved (reservations are location-pinned — a hold at the wrong location withholds stock the storefront can't sell). Every stock indicator, quick-add limit, and purchasability check derives from the same formula.
Pointers: `docs/STARTING_MANUAL.md` (D.17), `apps/storefront/src/modules/cart/components/quantity-stepper/index.tsx`.

**Q: Why Indonesian thousand-dots handling in the importer?**
A: Because "15.000" parsed as `Number()` becomes 15 — the engine once zeroed 543 SKUs' stock by reading min-buy columns and dot-formatted prices naively. Now `parseIdNumber` handles dots/commas/Rp and price/stock columns resolve by header name exact-then-fuzzy with index fallback, proven against the real `informasipenjualan.xlsx` (Stok=8, not 9).
Pointers: `docs/whole.md` (Data status), `apps/backend/src/api/admin/shopee-imports/engine.ts`.

## 5. Storefront

**Q: Why URL-prefixed locales instead of a cookie?**
A: Googlebot doesn't reliably set cookies, so cookie locales would leave the English site uncrawled. Prefixes give locale-distinct URLs for hreflang (`/id/id` vs `/en/id`, `x-default` → ID) at the cost of nesting `[locale]` beside `[countryCode]` — language and region vary independently, so English UI with IDR pricing works.
Pointers: `docs/ARCHITECTURE.md` (§8–§9), `apps/storefront/src/middleware.ts`, `docs/nanofield_ecommerce_plan.md` (v9).

**Q: Tell me about a bug where the code looked right but behaved wrong.**
A: Every English page rendered Indonesian despite `setRequestLocale("en")` running with correct params — proven by server logs showing `requestLocale=undefined` right after the set. Root cause: the write goes through React's `cache()`, and next-intl resolves `cache` from the root React 18 copy while the app renders with the storefront's React 19, so the write landed in a cache the reads never consult. Fix: middleware forwards the URL locale in next-intl's own `X-NEXT-INTL-LOCALE` header, which resolves with no cache involvement.
Pointers: `apps/storefront/src/middleware.ts`, `apps/storefront/src/i18n/request.ts`.

**Q: What are the server/client rules a contributor must follow?**
A: `getTranslations` in server components, `useTranslations` in client components, never hooks in shared modules (they render in both trees — pass labels as props, e.g. `LineItemPrice.originalLabel`). Error boundaries use header-read messages (`getRequestMessages`) because layouts don't run there. All internal links go through `LocalizedClientLink`; server redirects use `localizeServerPath()`.
Pointers: `docs/ARCHITECTURE.md` (§9), `apps/storefront/src/lib/util/server-locale.ts`.

**Q: How does the price-on-login gate work?**
A: Guests see "Sign in for price" CTAs and a gate modal on any buy attempt; prices and checkout require a verified, signed-in customer (registration enforces email verification — Mailtrap in dev, Resend in prod). Catalog content is identical for guests, bots, and members: no cloaking, no SEO cost.
Pointers: `apps/storefront/src/modules/common/components/sign-in-for-price/*`, `apps/storefront/src/modules/account/components/sign-in-gate-modal/*`, `docs/STARTING_MANUAL.md` (D.19, Part H step 0).

**Q: What was the cart-cookie outage?**
A: Every page 500'd for browsers holding a cart cookie (digest 565003953, Sep 9): a restored link had re-attached the deleted European Warehouse to the channel, and shipping-option listing crashed reading `fulfillment_sets` of undefined. Cookie-less probes stayed green, which hid it. Fix: channel references only live locations. Lesson: test authenticated/with-cart states, not just clean sessions.
Pointers: `docs/whole.md` (Sep 9 outage), `docs/STARTING_MANUAL.md` (Part K).

**Q: Why do translations live in JSON, not the database?**
A: UI chrome (nav, buttons, checkout steps, error screens — ~90 files, 18 namespaces) changes with code and reviews with code, so `src/messages/{en,id}.json` keeps copy diffs in the same PR. Backend-driven content (product/category/banner text) stays data by design — translating it is the deferred backend phase. Spec axis labels stay English as universal technical terms.
Pointers: `apps/storefront/src/messages/*`, `docs/ARCHITECTURE.md` (§8).

## 6. Operations

**Q: How do you verify a fresh clone or a second machine?**
A: Never from remembered findings: run the F0 seed script in `DRY_RUN=1` report mode (empty report = matches), re-check each Part E gate row, execute the two-lane Part H checkout. Same gates for clone and production — only values substitute.
Pointers: `docs/STARTING_MANUAL.md` (Parts E, I).

**Q: What are the restart rules?**
A: Region/country changes and env changes need a storefront restart (middleware region map caches an hour); product deletes self-purge via revalidate webhook (categories: 5-minute ISR); new admin pages need a real backend restart (admin hot-reload serves stale API). When in doubt, restart before reporting stale data.
Pointers: `docs/STARTING_MANUAL.md` (Part G), `docs/ARCHITECTURE.md` (§6).

**Q: Why was the debug-route removal safe?**
A: Both files were proven unreferenced first: git history showed scaffold/debug origins, and repo-wide search found zero callers (middleware, tests, widgets, scripts, docs). Medusa loads routes purely by file convention, so deletion unregisters with no other edits; both endpoints verified 404 after removal while `/store/regions` stayed 200.
Pointers: `docs/STARTING_MANUAL.md` (Topic index rule).

**Q: What's still open?**
A: `next build` static export crashes on `/404` (minified React #31 — proven on a clean-baseline build, pre-existing, dev unaffected). Backend content translation (product/category/banner text) is scoped but unscheduled. PSE registration and the Midtrans/RajaOngkir/Resend live-key flips are go-live items in `DEPLOY.md`.
Pointers: `docs/whole.md`, `DEPLOY.md`.

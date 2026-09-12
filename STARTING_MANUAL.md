# Nanofield Starting Manual — Fresh Clone to Working Checkout

*Companion documents: `README.md` (commands), `whole.md` (project state), `nanofield_ecommerce_plan.md` (business plan), `AGENTS.md` (conventions). This manual addresses a single question: **in which order are components to be configured after cloning, so that shipping and checkout function correctly?***

> **The governing principle is that order matters.** Nearly every instance of shipping failing to connect on a fresh clone is caused by a prerequisite created out of sequence (a region before its currency, an option before its fulfillment set, a location never linked to the channel). Parts A through H are to be followed from top to bottom; each step provides a **Verify** statement. **Part D explains each Medusa feature in setup order — its definition, its purpose, and the consequence of its absence.** **Part E defines the Definition of Ready gates for clone and production.** **Part J documents every menu, page, tab, and form of the backend administration**, both built-in and project-specific. This manual is universal: it contains no per-machine audit notes. On any machine, run the F0 script in `DRY_RUN=1` report mode plus the Part E Verify statements — an empty report plus passing gates means the machine matches this manual.

---

## Part A — Machine prerequisites

| Requirement | Version / notes |
|---|---|
| Node.js | v20 or later (`node -v`) |
| PostgreSQL | v15 or later. Create an empty database, for example `nanofield`. Then, as a superuser, execute `CREATE EXTENSION IF NOT EXISTS pg_trgm;` within it — the storefront search endpoint (`/store/search`) requires trigram similarity, and fails without it. |
| Redis | **Optional for development.** The backend operates on an in-memory fallback when Redis is absent; install Redis (or point to an instance) only for production-like behavior. |
| Package manager | **npm exclusively.** This installation uses `package-lock.json` (`packageManager: npm@11.0.0`). A second lockfile must never be introduced. Dependencies are to be installed inside the application that requires them. |

```bash
git clone <repo-url> nanofield
cd nanofield
npm install
```

---

## Part B — Backend environment (`apps/backend/.env`)

```bash
cp apps/backend/.env.template apps/backend/.env
```

Configure at minimum the following variables (the full list with comments is found in `.env.template`):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgres://<user>:<password>@localhost:5432/nanofield` |
| `JWT_SECRET` / `COOKIE_SECRET` | Long random strings (the template development defaults are not safe to share) |
| `STOREFRONT_URL` | `http://localhost:8000` |
| `REVALIDATE_SECRET` | Long random string — **it must be identical** in the storefront's `.env.local` (it authorizes instant catalog cache invalidation) |
| `RAJAONGKIR_API_KEY` | **SHIPPING COST (Cek Ongkir) key** from the Komerce Collaborator dashboard → Developer → Settings → Api Key. Use the **sandbox key first** for testing; replace it with the live key at go-live. **Without this key, every quotation silently returns the flat fallback (Rp 20.000) — checkout appears functional while all prices are placeholders that do not reflect carrier rates.** |
| `RAJAONGKIR_BASE_URL` | Sandbox base URL for testing, `https://rajaongkir.komerce.id/api/v1` for live operation |
| `RAJAONGKIR_ORIGIN_ID` | `19363` (Pasar Jambi, Kota Jambi 36133). Pinned numeric subdistrict identifier — it is not to be left empty in production (an empty value causes slow text resolution of `RAJAONGKIR_ORIGIN` at boot) |
| `RAJAONGKIR_DEFAULT_WEIGHT_G` | `500` (per-item fallback applied when a variant has no recorded weight) |
| `RAJAONGKIR_FALLBACK_AMOUNT` | `20000` (flat quotation returned when the API fails — checkout is never blocked) |
| `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` | Sandbox keys from the Midtrans dashboard → Settings → Access Keys (server key authorizes status reads/refunds; client key is served to the storefront Snap flow) |
| `MIDTRANS_IS_PRODUCTION` | `false` for testing; flip to `true` only at go-live together with the live keys. Register `{BACKEND_URL}/hooks/payment/midtrans` as the notification URL in the Midtrans dashboard per environment |
| `STORE_NAME` / `STORE_PHONE` / `STORE_ADDRESS_1` / `STORE_CITY` / `STORE_PROVINCE` / `STORE_COUNTRY_CODE` | Sender block printed as Pengirim on every shipping label (`GET /admin/orders/[id]/receipt`). No admin UI edits these yet — change them here |
| `TRACKING_SYNC_ENABLED` / `TRACKING_SYNC_CRON` / `TRACKING_SYNC_MAX_PER_RUN` / `TRACKING_SYNC_MIN_AGE_HOURS` | Auto-delivery sync job (`tracking-sync`, defaults `true` / every 6h / 5 per run / 6h min age). Shares the 100 hits/day RajaOngkir quota with checkout quotes — keep the cap small |

`STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` / `REDIS_URL` already default to local values in the template.

**Verify:** every `RAJAONGKIR_*` key in addition to `DATABASE_URL`, `REVALIDATE_SECRET`, and `STOREFRONT_URL` is non-empty. (The backend starts normally with an empty API key — it simply never obtains live quotations, which is precisely the failure mode to avoid.)

---

## Part C — Migration of the database and creation of the administrator user

```bash
cd apps/backend
npx medusa db:migrate
npx medusa user -e admin@test.com -p <choose-a-password>
```

**What `db:migrate` constructs automatically (these are not to be recreated manually):**

1. All module tables, including the custom `shipping_service` table (RajaOngkir service catalog — an empty table is acceptable; the built-in defaults `jne-reg` enabled and `jnt-eco` enabled apply automatically).
2. The project migration script `src/migration-scripts/initial-data-seed.ts` (tracked in `script_migrations`, executed **once**). It creates the standard Medusa scaffolding:
   - Default Sales Channel and Default Publishable API Key (linked to each other)
   - Default Store (currencies EUR as default, plus USD)
   - **Europe** region (EUR; countries gb/de/dk/se/fr/es/it; payment provider `pp_system_default`) with tax regions for those seven countries
   - **European Warehouse** stock location (Copenhagen/DK) with a link to the `manual_manual` provider, the "European Warehouse delivery" fulfillment set, the Europe service zone, Standard/Express flat manual shipping options, and the channel-to-location link
   - Four demonstration merchandise products (t-shirt/sweatshirt/sweatpants/shorts) with inventory levels

> Note: `npm run backend:seed` (repository root) runs the Nanofield shipping setup script (`apps/backend/scripts/seed-nanofield-shipping.mjs`, backend running, `ADMIN_EMAIL`/`ADMIN_PASSWORD` in environment); the Europe/DK scaffolding itself is seeded exclusively through `db:migrate` above. The Europe/DK scaffolding serves only as a starting point; Parts D and F replace it with the Indonesia configuration. The Europe region is to be retained (it is harmless, and the storefront default-region fallback requires at least one region to exist).

**Verify:** `script_migrations` contains `initial-data-seed`, and administration login succeeds at `http://localhost:9000/app`.

```bash
npm run backend:dev   # from the repository root; await the "Medusa is ready" message
```

---

## Part D — Medusa features, in setup order (definition and purpose of each)

Medusa decomposes commerce into small composable units. This section presents the complete tour in the same order in which Part F creates them. Each entry states **its definition, its purpose, and the consequence of its absence**, with the Nanofield-specific note.

### 1. Users and authentication (`medusa user`, `/auth/user/emailpass`)
The identities that operate the backend. The administrator user owns the dashboard session; API scripts (`seed-semiconductors.mjs`, the importer CLI) authenticate as this user to obtain a Bearer token. **Consequence of absence:** no dashboard access, no administration API, and no subsequent step in this manual can be performed.

### 2. API keys — secret versus publishable
- **Secret key:** grants full administrative power and must never leave the server environment. Scripts authenticate with the login token instead; the key itself is rarely used directly.
- **Publishable key:** the storefront's identity. It is transmitted as `x-publishable-api-key` / `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` and scopes every store request to the sales channels linked to it. **Consequence of absence:** storefront requests fail with a publishable-key error (which does not present as an obvious 401) and the catalog appears empty.

### 3. Sales channels
A channel is a storefront surface — it determines which products, prices, locations, and keys belong together. Nanofield operates one channel: **Default Sales Channel**. All customer-facing records (products, the publishable key, stock locations) must be attached to it. **Consequence of absence:** products exist but remain invisible; keys authorize nothing.

### 4. Store and currencies
The Store is the singleton record holding the shop name, the default channel, and the **supported currencies**. A region may only use a currency supported by the store — for this reason IDR is added (F2) before the Indonesia region is created (F4). The importer adds a missing IDR currency automatically as a fallback, and manual configuration never conflicts with it. **Consequence of absence:** region creation fails; prices cannot be expressed in IDR.

### 5. Regions
A region is the combination of a currency, a set of countries, and payment providers. It drives the storefront URL (`/id/...`, `/dk/...`), price selection, and checkout eligibility. At Nanofield, **Indonesia** (IDR, `id`) is the live region, while **Europe** (EUR) is starter scaffolding that is retained rather than deleted. The importer creates a missing Indonesia/IDR region automatically and reuses an existing matching one, so manual creation and import runs never produce duplicates. **Consequence of absence:** the middleware has no country to route toward; carts cannot resolve prices.

### 6. Payment providers assigned to a region
Each region declares which payment methods it accepts. The Indonesia region accepts **Midtrans** (`pp_midtrans_midtrans`, Snap checkout: QRIS, GoPay, bank transfer; signed webhook drives authorize/capture/refund), while regions without it keep **`pp_system_default`** (the built-in manual/system provider). **Consequence of absence:** region creation is rejected and checkout cannot complete payment.

### 7. Tax regions
Per-country tax configuration (`tp_system` denotes the system tax provider). Cart totals compute tax through these records. **Consequence of absence:** total and tax computation fails for checkouts in that country. The seed creates the seven European rows; the `id` row is created in F4 (or by the F0 script).

### 8. Stock locations (with address)
The physical premises at which inventory is held — **Pasar Jambi** (live) and the starter **European Warehouse**. The address constitutes the official pickup and returns record (city, province, and postal code matter for bookkeeping even though quotations use the environment-pinned origin identifier). **Consequence of absence:** inventory levels have no location to attach to, and nothing is sellable.

### 9. Location-to-sales-channel link
This link connects a location's stock to a storefront surface. The importer and the bulk-stock tools resolve the destination of stock through the channel's locations, falling back to the global first location when the channel has none — which is how stock silently lands at the wrong warehouse. **Consequence of absence:** products report zero purchasable stock and no shipping options are listed — even when levels exist elsewhere.

### 10. Fulfillment providers
The executable code that fulfills shipments. Two providers are relevant:
- **`manual_manual`** — built in; fixed-price or free options handled directly (used for the optional pickup option).
- **`rajaongkir_rajaongkir`** — the custom provider (`src/modules/rajaongkir-fulfillment/`, `identifier = "rajaongkir"`): live JNE/J&T quotations from the Komerce V2 API with a flat Rp 20.000 fallback so that checkout is never blocked. **Without the API key it remains operational — but every quotation equals the fallback price.** Uniform quotations of exactly Rp 20.000 always indicate a key problem.

### 11. Location-to-provider links
These declare which providers are permitted to ship from a location. Pasar Jambi requires **both** `manual_manual` and `rajaongkir_rajaongkir`. **Consequence of absence:** that provider's options are never listed for carts served by the location.

### 12. Fulfillment sets, service zones, and geo zones
The delivery geography tree attached to each location:
- **Fulfillment set** (for example `Pasar Jambi shipping`) — groups everything shippable from one location.
- **Service zone** (for example `Pasar Jambi`) — the attachment point for shipping options.
- **Geo zone** — the actual coverage rule (`country = id`). Carts match options through this rule. **Consequence of absence:** options exist but are eligible nowhere.

### 13. Shipping profiles
Profiles classify *products* by the manner in which they ship (default: **Default Shipping Profile**). Every product and every shipping option references one, and the two must match for the option to apply. Nanofield uses a single profile for the entire catalog — its only practical relevance is the `shipping_profile_id` field when options are created.

### 14. Shipping option types
Customer-facing tier labels such as **Standard** (`code: standard`) and Express. The tier is independent of the courier and service performing the work (REG/EZ are Standard; a future same-day service would be Express). A type must exist before options can reference it (`type_id`).

### 15. Shipping options
The choices presented at checkout. Two pricing modes exist:
- **Flat** (`manual_manual`): a fixed amount, for example free pickup.
- **Calculated** (`rajaongkir_rajaongkir`): the price is computed live for each cart — this requires `prices: []` (present but empty), a `type_id`, `rules` (`enabled_in_store=true`, `is_return=false`), and `data` containing the fulfillment-option payload (`{ id, courier, service }`, for example `jne-reg`). `validateOption`/`canCalculate` reject unrecognized service identifiers. **Consequence of absence:** the delivery step is empty and checkout cannot proceed.

### 16. RajaOngkir shipping services catalog (project layer, not Medusa core)
The `shipping_service` table with the `/app/rajaongkir-services` administration page and the `BUILT_IN_SERVICES` defaults (`jne-reg` and `jnt-eco` enabled; oke/yes/ctc/ctcyes/jtr disabled until a lane verifies them). This catalog is the menu from which the provider quotes — changes here alter checkout options without deployment. An empty table is a valid state meaning the defaults apply.

### 17. Inventory items, levels, and reservations
- **Inventory item:** the stock-tracked entity behind each variant (shared when variants share SKU roots).
- **Inventory level:** the quantity *per location* (`stocked_quantity`). This is the source of truth — the storefront stock indicator, quick-add limits, and purchasability all derive from it.
- **Reservations:** units held by active carts. The condition "in stock but cannot be added" normally indicates reserved rather than missing units. **Levels held at the wrong location produce an unsellable catalog** (on this machine, all 1000 levels reside at European Warehouse and none at Pasar Jambi).

### 18. Products, variants, categories, and publication
A product (with variants and SKUs) carries specification `metadata` (part_number, is_semiconductor, datasheet_url, and related fields) and is organized through categories. Two gates control storefront visibility: **`status`** (published versus draft — the importer drafts zero-stock items automatically) and **sales-channel availability**. If either gate is closed, the product is invisible and no error is reported.

### 19. Customers, addresses, and sessions
Store accounts with saved addresses (checkout reuses them; the address pages require no modification for shipping). Customer sessions expire server-side while pages continue to render — expired sessions produce 401 responses on write operations, presented as "Session expired — log out and back in."

### 20. Cart to order (composition of all units at checkout)
Checkout is the point at which every unit above converges: cart (region prices) → address (city and province feed the RajaOngkir destination lookup) → **delivery step** (location-to-channel, zone-to-geo-zone, option-to-provider-to-live-quote, summed variant weights in grams) → payment (`pp_system_default` for the present) → order with a fulfillment record stamped `{ courier, service, manual_booking: true }` (the AWB is booked manually outside the system). Any empty step in that chain traces back to exactly one Part F item.

### Dormant by decision (to be understood, not configured)
- **Returns, claims, and exchanges:** complete Medusa flows, unused until post-sale operations require them.
- **Promotions:** the discount-code engine, unused (no codes have been issued).
- **Price lists, customer groups, companies, and quotes:** the B2B reserve — the reason Medusa was selected; they remain disabled until genuine B2B demand appears.
- **Notification providers:** only the `feed` channel through the local provider is connected — it powers the administration bell (import completion and failure, order placement and cancellation, team changes).

---

## Part E — Definition of Ready (fresh clone and production)

No import and no launch proceed past this section until its gates pass. The model is two gates with a formal sign-off between them, and the gates are identical for a fresh clone and for production — only the values substituted in production differ (see Production substitutions below).

### Gate 1 — Pre-import (Execute is forbidden until every row passes)

| # | Requirement (procedure) | Required state | Verify |
|---|---|---|---|
| G1.1 | Publishable key linked to Default Sales Channel (F1) | Key-to-channel row exists | `publishable_api_key_sales_channel` |
| G1.2 | Store supports IDR (F2) | `idr` in supported currencies (manual configuration preferred; the importer adds it as fallback) | `store_currency` |
| G1.3 | Indonesia/IDR region with `pp_system_default` (F4) | Region present (manual configuration preferred; the importer creates a matching one as fallback); storefront restarted afterwards | `region`, `region_payment_provider`, then Part G restart rule 1 |
| G1.4 | Channel linked to Pasar Jambi (F6) | **Mandatory with no fallback.** Without it, stock resolution falls back to the global first location and every level lands at the wrong warehouse | `sales_channel_stock_location` |
| G1.5 | **Preview sign-off (formal).** A Preview run is executed and its log is inspected. Execute is forbidden until the log simultaneously shows: `location=` resolving to Pasar Jambi, the Stok column resolving to genuine stock figures, and the weight badge reporting a detected Berat header. The Preview log line is the authoritative evidence that Gate 1 holds; a passing Preview with any other location is a failed gate, not a warning. | Signed-off Preview log | Importer job report |

### Gate 2 — Pre-go-live (launch is forbidden until the Part H verification passes)

| # | Requirement (procedure) | Required state | Verify |
|---|---|---|---|
| G2.1 | Tax region for `id`, provider `tp_system` (F4) | `id` row exists | `tax_region` |
| G2.2 | Provider links on Pasar Jambi (F6) | `manual_manual` and `rajaongkir_rajaongkir` rows | `location_fulfillment_provider` |
| G2.3 | Fulfillment set, service zone, and `id` geo-zone (F7) | Set-to-location join; `id\|country` geo-zone row | `location_fulfillment_set`, `geo_zone` |
| G2.4 | Option type `standard` (F8) | Type row exists | `shipping_option_type` |
| G2.5 | Calculated options JNE REG, J&T EZ, and JNE City Courier (F9); pickup optional | Options with `price_type = calculated` | `shipping_option` |
| G2.6 | Levels at Pasar Jambi; publication sane (F10–F11) | All live levels at Pasar Jambi; zero-stock products drafted | F10 count query; product statuses |
| G2.7 | Live quotations and Jakarta checkout (Part H) | JNE REG ≈ Rp 26.000, J&T EZ ≈ Rp 22.000 at 1 kg; no uniform Rp 20.000 fallback | Storefront checkout |
| G2.8 | Administrator credentials rotated (shared or production environments) | Default development credentials no longer valid | Login audit |

### Production substitutions (same gates, changed values)

| Clone value | Production value |
|---|---|
| Sandbox `RAJAONGKIR_API_KEY` and sandbox base URL | Live SHIPPING COST key and `https://rajaongkir.komerce.id/api/v1` |
| Development `JWT_SECRET` / `COOKIE_SECRET` / `REVALIDATE_SECRET` | Freshly generated long random strings, backend and storefront copies identical |
| `STOREFRONT_URL=http://localhost:8000`, local CORS origins | Production storefront URL and production CORS origins |
| Local PostgreSQL with `pg_trgm` | Production PostgreSQL with `CREATE EXTENSION IF NOT EXISTS pg_trgm;` |
| In-memory fallback (no Redis) | Configured `REDIS_URL` |
| `admin@test.com` development password | Rotated administrator credentials |
| Absent Midtrans configuration | Sandbox then live Midtrans keys once Phase 2 is delivered |
| No backup before Execute | Full database backup before every Execute |

No repository document specifies the production hosting target: `whole.md` (Next item 10) and the plan (§2, §7) list Hetzner/Vultr Singapore, Biznet Gio, and Railway as undecided options, and the PSE registration check remains open. Those decisions are therefore excluded from this manual's scope; everything above applies regardless of host. A fresh production database exhibits the identical Europe seed scaffolding described in Part C (the region is retained; demonstration products are removed before import).

---

## Part F — Administration setup, in dependency order

The following steps are to be performed **in this exact order**. Each item states the reason it must precede the next.

**Manual setup is the primary path; importer automation is only a safety net.** The Shopee importer automatically adds a missing IDR currency and creates a missing Indonesia/IDR region (with `pp_system_default`), and it reuses an existing region when one already matches (currency `idr` containing country `id`) — therefore manual configuration and the importer do not produce duplicates. The importer does *not* create tax regions, channel links, fulfillment geography, option types, options, or provider links, and it places stock at the channel's first location (falling back to the global first location when the channel has none). Configuring the backend manually first is what guarantees stock lands at Pasar Jambi rather than at whatever location happens to be first.

### F0. Automated setup script (covers F2–F9, recommended after a fresh clone)

Prerequisites (non-negotiable): the database is migrated (Part C), the backend is running, and an administrator account has been created via `npx medusa user` (Part C) — every script in this project authenticates against that account through `/auth/user/emailpass`, so no script can run before it exists. `apps/backend/scripts/seed-nanofield-shipping.mjs` then performs steps F2 through F9 through the administration API — idempotently (existing matching records are reused, never duplicated; nothing is deleted) and in dependency order:

```bash
cd apps/backend
ADMIN_EMAIL=<admin-email> ADMIN_PASSWORD=<password> node scripts/seed-nanofield-shipping.mjs
# from the repository root: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run backend:seed
```

Behavior: ensures the IDR currency, the Indonesia/IDR region, the `id` tax region, the Pasar Jambi location (address overridable via `LOCATION_*` environment variables), the channel link, both provider links, the fulfillment set with its `id` service zone, the Standard option type, the enabled jne-ctc service, and the three calculated options. It aborts with an explicit message rather than risk duplicates whenever existing state cannot be read. **Verification remains mandatory afterwards:** each Gate row is re-checked with its Verify statement — the script reports what it created versus reused, and Preview sign-off (G1.5) still governs Execute. A report-only mode performs no writes:

```bash
DRY_RUN=1 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-nanofield-shipping.mjs
```

### F1. Publishable API key (storefront access)

The seed has already created the **Default Publishable API Key** linked to the Default Sales Channel. It may be reused: navigate to Settings → API Keys and copy it for Part G. If a new key is created instead, **it must be linked to the Default Sales Channel**, otherwise every storefront request fails with a publishable-key error.

**Verify:** `publishable_api_key_sales_channel` contains a row joining the key to `Default Sales Channel`.

### F2. Store currency: addition of IDR (before any Indonesia region)

Navigate to Settings → Store → Currencies and add **IDR**. A region's currency must belong to the store's supported currencies, otherwise region creation fails.

**Verify:** `store_currency` contains `eur`, `usd`, and `idr`.

### F3. Payments: retention of the system provider (until Midtrans is delivered)

The Midtrans integration (Phase 2) has not been built. Every region requires at least one payment provider, therefore **`pp_system_default`** is to remain on both regions. It must not be removed until the Midtrans provider is live and verified.

### F4. Region: creation of Indonesia (with tax region)

Navigate to Settings → Regions and create the region with the following values:

| Field | Value |
|---|---|
| Name | `Indonesia` |
| Currency | `IDR` |
| Countries | Indonesia (`id`) |
| Payment providers | `System default` (`pp_system_default`) |

Then create the **tax region** for `id` (provider `tp_system`) — without it, cart total and tax computation fails for Indonesian checkouts. (The seven European tax regions originate from the seed.)

**Verify:** `region` contains `Indonesia|idr`; `region_payment_provider` maps it to `pp_system_default`; `tax_region` contains an `id` row. **Then restart the storefront development server** (see Part G — the middleware caches the region map for one hour; a newly created region is invisible to routing until restart).

### F5. Stock location: Pasar Jambi (a location holding inventory must never be deleted)

Navigate to Settings → Locations and create `Pasar Jambi` with the complete address (city Jambi, country ID, province Jambi, street, postal code 36133). The quotation origin is environment-pinned (`RAJAONGKIR_ORIGIN_ID`), but the location address remains the official pickup record.

> **Recorded incident (September 8): a stock location holding inventory levels must never be deleted.** Deletion orphans every level (the "all stock zero with quick-add 500" outage) — **levels are to be moved to the new location first**, and only then may the old location be removed. A deleted location must never be re-linked to the channel: that exact error rendered every page unusable for authenticated users (September 9 outage).
>
> **Recovery when the old location was already deleted first:** the levels are stranded, not lost. (1) Link the live location (Pasar Jambi) to the Default Sales Channel per F6, so stock resolution points at it. (2) Re-run the Shopee importer **Execute** (or the bulk stock setter): synchronization targets the channel's location and rebuilds the levels there. (3) Verify with the F10 count query that all live levels reside at Pasar Jambi. (4) Leave the deleted location unlinked; its stranded level rows are invisible to the storefront once the channel references only live locations.

**Verify:** `stock_location` holds a Pasar Jambi row with its address row.

### F6. Links: channel-to-location and location-to-providers

Within Settings → Locations → Pasar Jambi:

1. **Sales channels:** add `Default Sales Channel`. Without this link, the location's inventory and fulfillment sets are invisible to the storefront (carts receive no shipping options).
2. **Fulfillment providers:** enable `manual_manual` (required for the pickup option) **and** `rajaongkir_rajaongkir` (the custom provider identifier — its exact value may be confirmed at any time with `GET /admin/fulfillment-providers`).

**Verify:** `sales_channel_stock_location` joins Pasar Jambi to Default Sales Channel; `location_fulfillment_provider` holds both provider rows for Pasar Jambi.

### F7. Fulfillment set and Indonesia service zone

On the Pasar Jambi location → Fulfillment Sets → create the set (for example `Pasar Jambi shipping`), then add a service zone (for example `Pasar Jambi`) with a **country geo-zone of `id`**. The zone is the structure shipping options attach to; the geo-zone is the rule that qualifies them for Indonesian carts.

**Verify:** `location_fulfillment_set` joins Pasar Jambi to the set; `geo_zone` holds an `id|country` row within the set's zone.

### F8. Shipping option type: Standard

Navigate to Settings → Shipping option types (or call `POST /admin/shipping-option-types`):

```json
{ "label": "Standard", "code": "standard", "description": "Standard delivery" }
```

Creation of a calculated option requires an existing `type_id` — this step is the reason option creation returns 400 on a fresh clone. (An `Express` type is to be added later, and only for genuine express services — REG/EZ are Standard.)

**Verify:** `shipping_option_type` holds a `standard` row.

### F9. Shipping options: JNE REG, J&T EZ, and JNE City Courier (calculated), pickup (manual, optional)

In the service zone → Add shipping option. For each RajaOngkir option, select **price type Calculated**, provider **`rajaongkir_rajaongkir`**, and the matching fulfillment-option payload in `data`. The third option requires its service to be enabled first: on `/app/rajaongkir-services`, enable **jne-ctc** (it ships disabled by default, and option validation rejects disabled service identifiers):

| Option | Service prerequisite | `data` payload |
|---|---|---|
| JNE REG | enabled by default | `{ "id": "jne-reg", "courier": "jne", "service": "REG" }` |
| J&T Express (ekonomis) | enabled by default | `{ "id": "jnt-eco", "courier": "jnt", "service": "EZ" }` |
| JNE City Courier | enable **jne-ctc** first | `{ "id": "jne-ctc", "courier": "jne", "service": "CTC" }` |

The following requirements return HTTP 400 when omitted (verified on this project): **`prices: []` must be present but empty** (calculated options carry no static prices), a valid `type_id` (F8), and `data` matching an enabled service. Rules: `enabled_in_store = true`, `is_return = false`.

The equivalent administration API call (identifiers are available from the administration interface or from `GET /admin/sales-channels`, `/admin/stock-locations`, `/admin/shipping-profiles`):

```bash
# authenticate first
TOKEN=$(curl -s -X POST http://localhost:9000/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"<password>"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -X POST http://localhost:9000/admin/shipping-options \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "JNE REG",
    "price_type": "calculated",
    "provider_id": "rajaongkir_rajaongkir",
    "service_zone_id": "<service-zone-id>",
    "shipping_profile_id": "<default-shipping-profile-id>",
    "type_id": "<standard-type-id>",
    "data": { "id": "jne-reg", "courier": "jne", "service": "REG" },
    "prices": [],
    "rules": [
      { "attribute": "enabled_in_store", "value": "true", "operator": "eq" },
      { "attribute": "is_return", "value": "false", "operator": "eq" }
    ]
  }'
```

The set of available services is administered live at `/app/rajaongkir-services` (no deployment required): `jne-reg` and `jnt-eco` are enabled by default; `jne-oke` / `jne-yes` / `jne-ctc` / `jne-ctcyes` / `jne-jtr` are disabled — each is to be enabled only after it demonstrably quotes on the operator's lanes (enabling an absent service merely quotes the cheapest JNE service under an incorrect label). Optionally, a fixed-price or free **pickup** option on `manual_manual` may be added through the administration interface.

**Verify:** `shipping_option` lists the calculated options with `price_type = calculated`.

### F10. Inventory levels belong at Pasar Jambi

Every variant requires a level row at Pasar Jambi (`stocked_quantity` equal to physical stock). The Shopee importer synchronizes stock to the channel's location upon execution; the bulk-stock widget assigns stock at the first stock location. After any movement, **counts are to be verified** — levels left at the former location do not follow products automatically:

```sql
SELECT sl.name, count(*) FROM inventory_level il
JOIN stock_location sl ON sl.id = il.location_id GROUP BY 1;
```

Expected end state: all live levels at Pasar Jambi, none stranded elsewhere. Publication follows stock (zero-stock products are drafted automatically on import runs).

### F11. Products: authentic catalog through the importer (or demonstration seed for verification only)

- **Authentic catalog:** administration → `/app/ecomm-import`. Upload all four workbooks (sales, basic, media, and **ship/Informasi Pengiriman** — the ship file carries per-variation `Berat` weights; without it every variant falls back to 500 g and light items are over-quoted). **Preview** is always to be executed first and constitutes the formal Gate 1 sign-off (Part E, item G1.5): **Execute** follows only upon a signed-off Preview — location resolving to Pasar Jambi, genuine Stok figures, detected weight header.
- **Slot rules (what each combination does):** the Penjualan (sales) file is mandatory — Preview and Execute both reject the run without it. Dasar and Media are optional: when omitted, existing descriptions, galleries, and category memberships are left untouched (the engine only overwrites them when the files supply replacements). A weights-only refresh is therefore run as **sales + ship** (current sales file plus the ship file): prices, stock, variants, and weights sync, while descriptions, images, and categories are preserved. An old sales file must never be used as a carrier for a new ship file — prices and stock would rewind to the old values.
- **Options for a sales + ship run:** enable **Publish new products** so restocked drafts return to the storefront automatically (zero-stock products stay draft regardless; deliberate manual unpublishes are only overridden when this is on). Leave **Overwrite content on existing products** off — with no Dasar/Media files there is nothing to sync, and off additionally guards existing content. Re-imports never duplicate: products match by `shopee_product_id`, so the same sales file updates rows in place (new Shopee listings appear as the only creates).
- **Demonstration verification only:** `cd apps/backend && ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-semiconductors.mjs` — twelve semiconductor SKUs, EUR/USD placeholder prices, 500 units of stock at the first location. The script is idempotent (existing handles are skipped). **Demonstration rows are to be removed before the authentic import** (handle collisions: `TRS-0051`, `IC-0399/0401`).
- Remaining-item sweep: confirm that no `lt-XXXX` load-test, merchandise, or demonstration rows remain in the live catalog.

---

## Part G — Storefront environment and start

Create `apps/storefront/.env.local` (no template file exists; the required keys are):

```bash
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<key from F1>
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=id
NEXT_PUBLIC_BASE_URL=http://localhost:8000
REVALIDATE_SECRET=<same value as backend>
```

```bash
npm run storefront:dev   # from the repository root; alternatively `npm run dev` for all applications
```

Open `http://localhost:8000/id/store` (prices exist only in IDR, therefore `/dk/` renders blank prices).

**Restart rules (to be consulted before reporting stale data or anomalous URLs):**

1. **After creating or modifying any region or country:** restart the storefront development server. The middleware caches the country-to-region map in memory and in the fetch cache for one hour. Switching to a country unknown to the cache redirects `/<new>` to `/<fallback>/<new>` (for example `/dk/id`), which resolves to a 404 page. After restart, navigate to `/<country>` directly.
2. After modifying environment variables: restart.
3. After deleting products or categories in administration: product changes invalidate automatically through `POST /api/catalog/revalidate` (which requires `STOREFRONT_URL` and a matching `REVALIDATE_SECRET`); category changes take effect within the five-minute ISR window — alternatively, restart. Account order pages (list and details) refresh on a 60-second window: shipment and payment changes made in administration appear there within a minute, no restart needed.

---

## Part H — Checkout verification (end-to-end, approximately 15 minutes)

1. Storefront → `/id/store` → add any in-stock item → cart.
2. Check out with a **Jakarta address** (for example Menteng) and confirm that **live quotations** appear: JNE REG ≈ Rp 26.000 and J&T EZ ≈ Rp 22.000 at 1 kg (reference lane, September 8). Then repeat with an **intra-Jambi address**: JNE City Courier ≈ Rp 10.000 and J&T EZ ≈ Rp 8.000 at 500 g. Both lanes are required — a single lane cannot distinguish a live quote from the fallback.
3. **Fallback check:** when every option quotes exactly Rp 20.000, the RajaOngkir key is absent or invalid (Part B) — correct the key, restart the backend, and retry. A *single* option at Rp 20.000 while the others are live is normal: that service does not exist on the lane (JNE REG has no intra-city service, JNE CTC has no inter-city service) and the fallback marks it unavailable. Exact-service options never borrow another service's price.
4. Place the test order; confirm that the fulfillment record is stamped `{ courier, service, manual_booking: true }` (the AWB is booked manually outside the system).
5. Restore any artificial test stock afterwards (for example the ten test units once assigned to IC-0394).

---

## Part I — Verification on any machine (universal, no per-machine notes)

This manual contains no per-machine audit list. On any machine — fresh clone, second laptop, or production — the state is derived from the gates, never from remembered findings:

1. Run the F0 script in report mode. An empty report means the machine already matches Parts F2–F9:
```bash
DRY_RUN=1 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-nanofield-shipping.mjs
```
2. Re-check each Part E Gate row with its Verify statement (key-to-channel row, `store_currency`, `region` + `region_payment_provider`, `sales_channel_stock_location`, signed-off Preview log, `tax_region`, `location_fulfillment_provider`, fulfillment set/zone/`id` geo-zone, `shipping_option_type`, calculated `shipping_option` rows, F10 level counts).
3. Execute the Part H checkout (Jakarta reference lane + intra-Jambi lane). Two lanes are required because a single lane cannot distinguish a live quote from the flat fallback: Jakarta and Jambi must quote differently.
4. Deleted locations stay deleted and never re-linked; stranded level rows require no action once the channel references only live locations and the F10 count confirms live levels.

---

## Part J — Backend administration reference (every menu, page, tab, and form)

The administration is served at `http://localhost:9000/app`. Section I.1 lists the project-specific pages (pinned above the standard menu); Sections I.2–I.5 document the built-in Medusa v2.19 administration, verified against the shipped route inventory; Section I.6 documents the injected widgets. Paths are given as `/app/<path>` throughout.

### I.1. Project-specific pages (pinned navigation)

| Sidebar label | Path | Purpose and contents |
|---|---|---|
| Nanofield | `/app/overview` | Store home and business overview. Revenue and order-count charts (daily for 30 days, monthly for 12 months, yearly) with revenue/orders/average stat cards in the most-used currency; an empty state is shown before the first sale. Purpose: daily commercial health at a glance. |
| E-comm Import | `/app/ecomm-import` | Shopee Excel import pipeline. Forms: four workbook upload fields (sales, basic, media, ship/Informasi Pengiriman); **Preview** action (validates without writing; lists skipped rows with identifier and reason; reports the detected weight column); **Execute** action (writes the catalog); job list with per-job detail (counts, errors). Purpose: the sole entry point of the authentic catalog. |
| Shipping Services | `/app/rajaongkir-services` | Live catalog of quotable courier services. Table columns: code, courier, service code, label, cheapest-match flag, enabled state. Actions: enable/disable toggles (built-ins `jne-reg` and `jnt-eco` can only be disabled, never deleted); creation and deletion of custom services. The F9 JNE City Courier option additionally requires `jne-ctc` to be enabled here, since option validation rejects disabled service identifiers. Changes apply to checkout immediately without deployment. Purpose: day-to-day control of which courier services are offered. |
| Notification bell (top bar drawer) | — | Project notification center fed by the `feed` channel of the local notification provider. It records itemized completions and failures (Shopee import, bulk stock/delete, order placement/cancellation/shipment, team membership changes, product-category changes) with title and summary line. Amounts render as `Rp 190.000` (never raw decimals). Semantics: entries persist indefinitely with pagination — history is never deleted server-side; the drawer itself is stock Medusa behavior (a DOM-sweep customization that hid read rows was reverted in Sep 2026 after it froze the admin — do not re-add drawer DOM manipulation); unread means newer than the last drawer opening (blue dot on the bell); a bottom-right toast announces arrivals newer than the last visit (polls every 60 seconds). Deliberately silent: routine product events (covered by import summaries), order updates, and fulfillment/return/claim events. Purpose: operational awareness without log inspection. |

### I.2. Commerce menus (sidebar)

**Orders** (`/app/orders`)
- *List page:* searchable, filterable, exportable order table. Purpose: locating orders by status, region, or customer.
- *Detail page* (`/app/orders/:id`): summary header; items table; payment and totals; shipping address and billing address forms (editable through dedicated edit drawers); email edit; timeline of events; metadata editor. The project injects an **Order Receipt** widget (Section I.6): once the payment is captured it offers a **Print** button that opens the thermal shipping label (`GET /admin/orders/[id]/receipt` — Penerima address + Pengirim sender block from the `STORE_*` env vars + tracking QR; print with margins None on 80mm rolls). Action drawers: **Create Fulfillment** (allocate items to a location and provider), **Create Shipment** (dispatch with tracking data), **Create Return** / **Receive Return** (return flow with reason selection), **Create Exchange**, **Create Claim**, **Create Refund** (with refund-reason selection), **Edit Order** (add/remove items before fulfillment), **Request Transfer** (move the order to another customer). Purpose: the complete post-purchase operational lifecycle.

**Draft Orders** (`/app/draft-orders`)
- Manual order composition: add items and quantities, attach a customer, set shipping method and address, register payment, then convert to a standard order. Purpose: telephone, WhatsApp, and other assisted sales that do not pass through the storefront.

**Products** (`/app/products`)
- *List page:* product table with search, category filters, and export; creation entry point. The project injects the bulk stock/delete toolbar here (Section I.6).
- *Creation form:* title, handle, description, media uploads, options (for example Size, Color) with values, variants (SKU, option combination, prices per currency, inventory), organization (categories, collections, tags, type), sales-channel assignment, shipping-profile assignment, metadata. Purpose: the single form that defines everything a product needs to be sellable.
- *Detail page tabs:* General/Attributes (editable fields), Media (gallery management), Prices (per-currency variant pricing), Organization (categories, tags, type, collections), Sales Channels (availability gates), Inventory/Stock (levels per location), Variants (per-variant detail, edit, media, metadata, inventory-item linkage), Metadata (key-value editor, including the Nanofield specification fields). Purpose: lifecycle management of one product.
- *Import/Export:* CSV product import and product export actions. Purpose: bulk catalog movement outside the Shopee pipeline.

**Categories** (`/app/categories`)
- Tree-structured list; create/edit forms (name, handle, description, active flag); organize view (nesting and rank); products tab (membership); metadata editor. Purpose: the browsable catalog taxonomy rendered by the storefront filter.

**Collections** (`/app/collections`)
- Create/edit forms, product membership management, metadata editor. Purpose: curated product groupings (campaigns, featured sets).

**Product Options** (`/app/product-options`)
- Shared option definitions (for example Size with values S/M/L/XL) with create/edit/detail/metadata views and value management. Purpose: consistent variant dimensions across products.

**Gift Cards** (`/app/gift-cards`)
- Policy (denomination) list and detail views. Purpose: stored-value instruments. Unused at Nanofield; documented for completeness.

**Inventory** (`/app/inventory`)
- *List page:* inventory items with SKU, stocked and reserved quantities; export action. *Detail page:* attribute editing, per-location stock adjustment form, metadata editor. Purpose: the canonical stock record behind every variant.
- **Adjust Availability** form: quantity corrections per location. Purpose: recounts and manual corrections.
- **Reservations** (`/app/reservations`): the location-scoped holds behind "in stock but cannot be added." Although the menu sits beside Inventory rather than inside a location, every reservation is pinned to one stock location and decrements availability only there.
  - *List page:* table of reservations (inventory item, location, quantity, originator, timestamps) with search. Purpose: auditing what is currently held and where.
  - *Create form:* inventory-item selector, stock-location selector, quantity, and optional description/metadata. Purpose: manual holds (for example reserving units for a pending offline sale). The location field is the critical input — a reservation at the wrong location withholds stock the storefront cannot sell from the live location.
  - *Detail and edit views:* quantity adjustment, metadata, and deletion (release). Purpose: correcting or releasing holds.
  - *Relationship to locations:* reservations never appear as a tab of a location; they are interpreted against the location's levels (available = stocked − reserved). When diagnosing availability, the location's levels and its reservations are always read together.

**Customers** (`/app/customers`)
- List and creation form; detail page with information editing, address book management (add/edit), group membership, order history, and metadata editor. Purpose: account administration and support.

**Customer Groups** (`/app/customer-groups`)
- Create/edit forms, customer membership management, metadata editor. Purpose: segmentation for tiered pricing. Dormant at Nanofield (B2B reserve).

**Promotions** (`/app/promotions`) **and Campaigns** (`/app/campaigns`)
- Promotion create/edit/detail views (discount type, conditions, application rules, usage limits) with campaign linkage; campaign list/detail with budget editing and configuration. Purpose: discount codes and campaign budgets. Unused at Nanofield (no codes issued).

**Price Lists** (`/app/price-lists`)
- Create/edit/detail views (sale versus override type, validity dates, customer-group scoping), price add/edit forms per variant, configuration view. Purpose: scheduled or segmented pricing. Dormant at Nanofield (B2B reserve).

### I.3. Settings menus (gear icon)

**Store** (`/app/settings/store`)
- Detail and edit forms: store name, default sales channel, default currency and region. **Currencies tab** (add/remove supported currencies — the F2 step). **Locales tab** (add content locales). Metadata editor. Purpose: shop identity and monetary foundation.

**Regions** (`/app/settings/regions`)
- *List page:* region table (name, currency, country count). Rows navigate to detail. Purpose: regional inventory of the shop's commercial territories.
- *Create form:* fields for name (for example `Indonesia`), currency (select — restricted to store-supported currencies, hence F2 precedes F4), countries (multi-select of ISO codes), and payment providers (multi-select — at Nanofield, `System default` only). Purpose: the F4 step.
- *Detail page:* summary header with edit action (rename, change currency, adjust providers); **countries management** (add-countries form to extend coverage; removal of countries); delete action (blocked while the region carries orders or prices — cleanup is performed through reassignment first). Purpose: lifecycle of one commercial territory.
- *Metadata tab:* key-value editor for operator notes and integrations. Purpose: non-structural annotations only; never load-bearing configuration.

**Tax Regions** (`/app/settings/tax-regions`)
- *List page:* one row per configured country with its provider (at Nanofield, `tp_system` throughout). Purpose: confirming which jurisdictions have tax mathematics at all — the absent `id` row is precisely the current gap.
- *Create form:* country selector and provider selector. Purpose: the F4 tax step; one row per selling country.
- *Detail page tabs:*
  - *Provinces:* subdivide a country (create/detail forms for province code and name). Purpose: provincial rates where applicable; at Nanofield the country-level default suffices and provinces remain unused.
  - *Tax rates:* create/edit forms (rate name, percentage, reference code, default/combinable flags). Purpose: the actual percentages applied to cart totals. Incorrect rates here silently misprice every checkout in that country.
  - *Tax overrides:* create/edit forms scoping a divergent rate to specific products or customer segments. Purpose: exceptions (for example reduced rates on qualifying goods). Unused at Nanofield.
- *Delete action:* removal of a country's configuration. Purpose: withdrawal from a jurisdiction; never performed while the country remains in a live region.

**Locations & Shipping** (`/app/settings/locations`)
- *List page:* location table with active/deleted state; entry point to creation. Deleted locations remain listed with their state — a deleted row must never be re-linked (September 9 incident).
- *Create/edit forms:* name and the full address record (street lines, city, country code, province, postal code, phone, company). Purpose: the F5 step. Address completeness matters for pickup, returns, and bookkeeping even though quotations use the environment-pinned origin.
- *Metadata tab:* key-value editor for operator annotations. Purpose: non-structural notes only.
- *Location detail tabs:*
  - *Sales Channels tab:* membership management (add/remove channels). Purpose: the F6 channel link — the single control deciding whether a location's stock and fulfillment serve the storefront.
  - *Fulfillment Providers tab:* provider enablement toggles (`manual_manual`, `rajaongkir_rajaongkir`). Purpose: the F6 provider links — only enabled providers' options are listed for the location's carts.
  - *Fulfillment Sets tab:* set creation (name, type `shipping`); each set opens its **service zones**, and each zone offers: zone create/edit forms (name); **manage-areas** form (geo-zone rules — country, province, city, postal expression — the F7 `id` rule); **shipping-option create form** (name, price type flat/calculated, provider selector, shipping-profile selector, option-type selector, `data` payload editor, prices table, rules editor); **option edit form** (same fields post-creation); **pricing view** (flat amounts per currency/region; calculated options show no static prices by design). Purpose: the F7–F9 steps in full.
- *Manage Locations view:* cross-location comparison and administration. Purpose: multi-warehouse operations and discrepancy review.

**Shipping Profiles and Option Types**
- Shipping profile list/create/detail views with metadata editor: product shipping classification (the F9 `shipping_profile_id`). Shipping option type list/create/detail/edit views: tier labels (the F8 step). Purpose: the two taxonomies every shipping option references.

**Sales Channels** (`/app/settings/sales-channels`)
- *List page:* channel table (at Nanofield, the single Default Sales Channel). Purpose: confirming the selling surfaces in operation.
- *Create/edit forms:* name, description, and disabled flag. Purpose: additional surfaces (wholesale storefront, marketplace feed) when required; a disabled channel immediately hides its entire assortment.
- *Products tab:* membership management (add/remove products in bulk). Purpose: assortment control — a product absent from the channel is invisible to the storefront regardless of publication status.
- *Metadata tab:* key-value editor. Purpose: integration annotations.
- *Associated locations:* visible through the location side of the link (Locations → Sales Channels tab). Purpose: the stock-supply side of the same relationship; both directions describe one link.

**Product Tags** (`/app/settings/product-tags`) **and Product Types** (`/app/settings/product-types`)
- *List pages:* value tables with product counts per entry. Purpose: auditing taxonomy usage before renaming or merging.
- *Create/edit forms:* the value itself (for example tag `mosfet`, type `Transistor`) with optional description. Purpose: extending the classification vocabulary; values are referenced by handle, so renaming an in-use value reclassifies every product carrying it.
- *Detail views:* member-product listing with removal, and metadata editors. Purpose: curation and integration annotations.
- *Consumption points:* tags and type surface on the product Organization tab and drive storefront filtering and reporting. At Nanofield the primary taxonomy remains categories; tags and types serve refinement and external feeds.

**Publishable API Keys** (`/app/settings/publishable-api-keys`)
- List, create, detail, and edit views; sales-channels tab for channel scoping. Purpose: storefront credential management (the F1 step).

**Secret API Keys** (`/app/settings/secret-api-keys`)
- List, create, detail, and edit views. Purpose: server-to-server credentials. Handled with the precautions of passwords.

**Users** (`/app/settings/users`)**, Roles** (`/app/settings/roles`)**, Profile** (`/app/settings/profile`)
- User list, invitation form (email with role assignment), detail/edit views, metadata editor. Role create/edit views with the permission matrix and user assignment; own-profile detail view. Purpose: team administration and least-privilege access control.

**Return Reasons** (`/app/settings/return-reasons`) **and Refund Reasons** (`/app/settings/refund-reasons`)
- *List pages:* reason tables (code, label, applied counts). Purpose: confirming the vocabularies available to operators; empty lists force free-text handling at the moment of the return.
- *Create/edit forms:* unique value/code, human-readable label, description, and (for return reasons) an optional parent reason for hierarchical classification (for example `defect` → `dead-on-arrival`). Purpose: standardizing post-sale categorization so return and refund reports remain comparable over time.
- *Consumption points:* return reasons appear in the order **Create Return** and **Receive Return** drawers; refund reasons appear in the **Create Refund** drawer. A missing reason does not block the flow — it degrades its reporting.
- *Nanofield guidance:* define the small closed set before the first return occurs (faulty, wrong-item, changed-mind, damaged-transit); hierarchical parents may be added later without disturbing existing records.

**Translations** (`/app/settings/translations`)
- Locale list, string editing views, locale creation. Purpose: localization of translatable administration and store content.

**Workflows** (`/app/settings/workflows`)
- *Execution list:* table of workflow runs (workflow name, status — completed, failed, awaiting — started and finished timestamps). Filters separate successes from failures. Purpose: the first screen consulted when a background process (import, bulk operation) misbehaves.
- *Execution detail:* step-by-step trace with per-step state, inputs, outputs, and error payloads; compensation/rollback information where the workflow defines it. Purpose: pinpointing the exact failed step and its cause without code inspection.
- *Scope note:* this area is strictly observational — executions are inspected here, never edited or re-triggered. Retries and corrections are performed through the originating feature (for example re-running an import Execute).

### I.4. Authentication pages
Login form (email and password, project-branded backdrop), invitation acceptance, and password reset. Purpose: access control entry points; no configuration is performed here.

### I.5. Page anatomy conventions (applicable throughout)
- **List pages** provide search, filters, pagination, and row navigation to detail pages; destructive actions request confirmation.
- **Detail pages** are organized into sections and tabs; each section carries its own edit form or drawer, so changes are scoped and reviewable.
- **Forms** validate inline and report server errors with HTTP status and message; failed submissions never partially apply.
- **Drawers and modals** (fulfillment, returns, refunds, stock adjustment, bulk tools) always present a preview or summary before the confirming action.

### I.6. Project-injected widgets (where custom interface appears inside built-in pages)
| Widget | Injection zone | Location and function |
|---|---|---|
| Datasheet editor | `product.details.side` | Product detail sidebar: semiconductor toggle, datasheet URL field, and MPN field (see `whole.md` for the display rule). |
| Bulk stock and delete tools | `product.list.before` | Product list toolbar: two-button bar opening Set-stock and Delete drawers with search, cross-page selection, preview, and parallel execution (see `whole.md`). |
| Order receipt | `order.details.side.before` | Order detail sidebar: Print button + tracking-QR preview, visible only once the payment is captured; opens the thermal shipping label in a print frame (see `whole.md`). |
| Branding | topbar, sidebar, login | Nanofield visual identity (badge, avatar, login circuit backdrop, copy adjustments). Decorative and textual only; no operational function. |

---

## Part K — Lessons learned (recorded incidents)

- **A stock location holding inventory must never be deleted** — levels are to be moved first (F5/F10).
- **The channel must reference only live locations.** A link to a deleted location crashes shipping-option listing for carts and renders every page unusable for users holding a cart cookie (September 9 incident).
- **Region-before-currency fails; option-before-zone/type fails; unlinked-location options are never listed.** When shipping fails to connect, the F2→F9 sequence is to be walked in order and each Verify statement checked.
- **`admin@test.com` credentials are to be rotated before any shared or staging deployment** (plan §7).
- **`.env` files must never be committed and secret values must never be printed; `package-lock.json` must never be hand-edited; a migration that may already have run must never be rewritten** — a new migration is to be added instead (`npx medusa db:generate <module>` from `apps/backend`).
- **Expired customer sessions** present as 401 responses on authenticated writes while pages continue to render — signing out and back in is the first step for authenticated users reporting inoperative actions.
- **Never inject DOM manipulation into Medusa core UI that React also manages** (September 2026 incident: a feed-drawer tidy script froze the entire admin on bell open — reverted; the drawer stays stock).
- Pre-existing noise to be disregarded: the storefront `tsc --noEmit` TS2786 React-types flood (output is to be filtered to modified files); VSCode `@tailwind`/`@apply` warnings (editor-only).

# Nanofield Architecture Sketch

*Rough-drawn map of how the pieces connect. Detail lives in `whole.md` (state), `STARTING_MANUAL.md` (procedures), and `nanofield_ecommerce_plan.md` (business context). All diagrams read top-down or left-to-right in flow order.*

---

## 1. System overview — who talks to whom

```text
                    ┌─────────────────────────┐
                    │  Shopee / TikTok Shop   │
                    │  (Excel mass exports)   │
                    └────────────┬────────────┘
                                 │ 4 workbooks: sales, basic,
                                 │ media, ship (Berat weights)
                                 ▼
┌──────────┐   ┌─────────────────────────────────────────┐   ┌──────────────────┐
│ Operator │──▶│  Medusa backend  (apps/backend, :9000)  │──▶│  Komerce V2 API  │
│ (admin   │   │                                         │◀──│  (RajaOngkir     │
│  /app)   │   │  ┌──────────────┐  ┌─────────────────┐  │   │   shipping cost) │
└──────────┘   │  │ Admin API +  │  │ Store API       │  │   └──────────────────┘
               │  │ custom routes│  │ (publishable    │  │
               │  │ /app/* pages │  │  key scoped)    │  │   ┌──────────────────┐
               │  └──────────────┘  └────────┬────────┘  │──▶│  Midtrans (Snap  │
               │                             │           │   │  + webhook)      │
               │  ┌──────────────────────────┴────────┐  │   └──────────────────┘
               │  │  Postgres (products, orders,      │  │
               │  │  regions, locations, levels…)     │  │
               │  └───────────────────────────────────┘  │
               └─────────────────────────────────────────┘
                                 ▲
                                 │ Store API (prices, carts,
                                 │ regions, shipping options)
                                 │
                    ┌────────────┴────────────┐
                    │  Next.js storefront     │
                    │  (apps/storefront,      │
                    │   :8000 → /id/…)        │
                    └────────────┬────────────┘
                                 ▲
                                 │ browse, search,
                                 │ cart, checkout
                                 │
                          ┌──────┴──────┐
                          │  Customer   │
                          └─────────────┘
```

Ports: backend `:9000` (API + `/app` admin), storefront `:8000`. One Postgres database, one Default Sales Channel, one live region (`id`/IDR).

---

## 2. Catalog pipeline — Shopee workbooks to sellable products

```text
sales.xlsx + basic.xlsx + media.xlsx + ship.xlsx
        │
        ▼
/app/ecomm-import ──▶ Preview (dry run, validates only)
        │                    │
        │                    ├── skipped rows (id + reason)
        │                    ├── Stok column resolution
        │                    └── Berat weight badge (else 500 g fallback)
        │
        │── GATE: Preview sign-off ──▶ Execute (writes)
        │                                      │
        │                                      ├── products + variants (IDR prices)
        │                                      ├── categories (auto-created)
        │                                      ├── spec metadata (part_number, …)
        │                                      ├── variant weights (ship file)
        │                                      ├── inventory levels ──▶ channel's location
        │                                      └── publication follows stock (0 = draft)
        │
        ▼
revalidate-storefront ──▶ POST /api/catalog/revalidate ──▶ storefront cache purge
```

Rule of the pipeline: Preview never writes; Execute never runs without a signed-off Preview showing stock landing at Pasar Jambi.

---

## 3. Commerce chain — the hierarchy every checkout walks

Each layer exists to answer one question. A break at any layer produces a specific, diagnosable symptom.

```text
Sales Channel  (Default — the storefront surface)
    │  "Which shop is this?"
    │  missing link → invisible products, no shipping options
    ▼
Stock Location  (Pasar Jambi — where inventory physically sits)
    │  "Where is the stock?"
    │  wrong/deleted location → orphaned levels, unsellable catalog
    ▼
Fulfillment Set  (Pasar Jambi shipping — what this location can ship)
    │  Service Zone  (Pasar Jambi — attach point for options)
    │      │  Geo Zone  (country = id — coverage rule)
    │      │  "Who may buy with delivery?"
    │      │  missing rule → options exist but qualify nowhere
    ▼
Shipping Option  (JNE REG / J&T EZ / JNE City Courier)
    │  price_type = calculated, prices = [], rules, data = { courier, service }
    │  "What choices does the customer see?"
    ▼
Fulfillment Provider  (rajaongkir_rajaongkir ←→ manual_manual for pickup)
    │  "Who computes the price?"
    │  + Shipping Services catalog (/app/rajaongkir-services — the live menu)
    ▼
Komerce V2 API  (live quote per cart; fallback Rp 20.000 — never blocks)
```

Parallel chains every cart also resolves: Region (`id`/IDR + `pp_system_default`) for prices, tax region (`id`) for totals, shipping profile + option type (`standard`) for eligibility.

---

## 4. Checkout quote sequence — one delivery step, end to end

```text
Customer address (city + province)
        │
        ▼
Cart (region prices, summed variant weights in grams)
        │
        ▼
GET /store/shipping-options?cart_id=…
        │
        ▼
For each calculated option:
    provider.validateOption(data.id) ── must be an ENABLED service
        │  (this is why jne-ctc must be toggled on before its option exists)
        ▼
    provider.calculatePrice()
        ├── origin: RAJAONGKIR_ORIGIN_ID (19363, pinned)
        ├── destination: domestic-destination search (cached 24 h)
        ├── ONE domestic-cost call per courier → split client-side by code
        │     JNE REG exact  ·  J&T cheapest (EZ)  ·  CTC exact
        └── any failure → flat RAJAONGKIR_FALLBACK_AMOUNT (Rp 20.000)
        │
        ▼
Delivery options rendered → customer picks → payment → order
        │
        ▼
Fulfillment stamped { courier, service, manual_booking: true }
(AWB booked manually outside the system)
```

---

## 5. Administration surface — custom versus core

```text
/app ──┬── Nanofield            (custom — store home, revenue charts)
       ├── E-comm Import       (custom — catalog pipeline UI)
       ├── Shipping Services   (custom — live courier menu)
       │
       ├── Orders / Draft Orders      (core — lifecycle drawers)
       ├── Products (+ bulk-tools widget, datasheet widget)
       ├── Categories / Collections / Options / Gift Cards
       ├── Inventory / Reservations
       ├── Customers / Customer Groups
       ├── Promotions / Campaigns / Price Lists   (dormant)
       │
       └── Settings ──┬── Store / Regions / Tax Regions
                      ├── Locations & Shipping  (E5–E9 happen here)
                      ├── Sales Channels / Profiles / Option Types
                      ├── Tags / Types / API Keys / Team
                      ├── Return & Refund Reasons / Translations
                      └── Workflows (read-only execution traces)
```

Convention: custom pages sit pinned above core navigation; custom widgets inject into core pages (`product.list.before`, `product.details.side`, `order.details.side.before` — receipt printing via `GET /admin/orders/[id]/receipt`); the bell drawer is fed by the local `feed` notification channel (stock drawer — no DOM injection).

---

## 6. Cache and freshness — why a restart fixes "stale"

```text
Backend event (product change)
        │  revalidate-storefront subscriber
        ▼
POST /api/catalog/revalidate (STOREFRONT_URL + shared REVALIDATE_SECRET)
        │  products: instant purge · categories: 5-min ISR window
        ▼
Storefront Next.js cache (force-cache + revalidate: 300)

Middleware region map: in-memory + fetch cache, 1-hour TTL
        │  new country invisible until refresh
        ▼  → restart dev server, navigate to /<country> directly
```

---

## 7. Dormant and future — drawn dashed for a reason

```text
 - - - Manual pickup option (manual provider, admin UI only)
 - - - Weight-gated cargo options (JTR above X kg via option rules)
 - - - R2 image migration (today: cf.shopee.co.id hotlinks)
 - - - Tokopedia import split · second warehouse · white-label
 - - - B2B modules (customer groups, price lists, companies, quotes)
 - - - Hosting decision + PSE registration (see plan §7)
```

Nothing dashed is required for launch; nothing solid may be skipped before it.

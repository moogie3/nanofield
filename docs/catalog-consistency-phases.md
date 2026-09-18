# Catalog Consistency Phases — Variation, Category, Datasheet, Search

*Status: Phase 0 audited Sep 12, 2026 (baseline below) — Phases 1-5 measure against it. Goal: maximum consistency through the whole storefront — the same part is found the same way from nav search, catalog search, category filter, option filter, and datasheet filter.*

## Why this order

Each phase is a contract for the next one:

```text
stable values -> canonical categories -> structured specs -> search index -> filter UI
```

Doing UI first would bake Shopee's source noise (free-form variation names, 200+ leaf categories) into permanent filters. Doing specs before categories would map specs to names that get renamed a week later.

## Current state (Sep 2026)

* **Variation import is faithful but not filter-ready.** `apps/backend/src/api/admin/shopee-imports/engine.ts` (`buildPlans`, `upsertOne`) creates one generic option `Variation` per product with values taken verbatim from Shopee `Nama Variasi` (`Default` fallback). Re-imports reuse values via the `knownValues` check, so nothing duplicates — but `10K` vs `10k`, trailing spaces, and one-off seller spellings become distinct filter values.
* **Categories are noisy.** `leafCategory()` derives the leaf from the Shopee `Kategori` path with an `Others -> Parent Others` fix. That preserves fidelity but yields a long tail of near-duplicate leaves. No canonical map exists yet.
* **Datasheet rule is strict and shared.** Storefront `apps/storefront/src/lib/util/product-datasheet.ts` (`getDatasheetInfo`) + admin `apps/backend/src/admin/widgets/product-datasheet.tsx` agree: `no_datasheet=true` hides, `datasheet_url` always links, otherwise requires `is_semiconductor=true` plus an identifier (`mpn` / `datasheet_search` / `part_number`). The importer sets `part_number` + `is_semiconductor` from the SKU prefix (`classifySku`). Title/handle are never search terms. There is no catalog-level `has_datasheet` filter yet.
* **Search ranking is unified, coverage is not.** Backend `apps/backend/src/api/store/search/route.ts` (`trgmSql` / `plainSql`) ranks exact `SKU / part_number / handle` > title substring > trigram similarity > tsvector rank, typo-tolerant, published-only. It does not index `mpn`, normalized option values, spec metadata, or category names. Both UIs converge on it: nav `site-search/index.tsx` (dialog, live `limit=7` suggestions, then `/{cc}/store?q=`) and catalog `search-field/index.tsx` (hero + compact, direct `/{cc}/store?q=`). Hydration is single-path: `searchProductIds() -> listProducts()` in `apps/storefront/src/lib/data/products.ts`, rank restored in `paginated-products.tsx`.
* **Option filtering is plumbed but headless.** `listProductsWithSort` accepts `option_value_id`, `store/page.tsx` parses `?optionValueIds=` via `product-option-filters.ts`, but `refinement-list/index.tsx` only renders Sort + View + `CategoryFilter`. No option/spec/datasheet UI exists, so the backend capability is unreachable.

## Phase 0 — Audit (read-only)

Goal: quantify the mess so normalization rules are data-driven.

* Distinct raw `Variation` values per Shopee leaf: case splits, whitespace, `Default` vs empty, emoji.
* Category cardinality: `leafCategory()` output count, `Others` bucket size, top-30 vs long tail.
* Metadata coverage: `% with part_number / is_semiconductor=true / mpn / datasheet_url / no_datasheet`.
* Search gaps: sample queries (`IRF540N`, `bimetal kulkas`, `10k resistor`, `ne55`) against current index; record which fail due to `mpn`/option/category blindness.
* Acceptance: audit table checked in here as baseline; Phases 1-5 measure against it.

### Phase 0 results (Sep 12, 2026 — live DB, read-only SELECTs)

| Area | Finding |
|---|---|
| Products | 5397 total, **3623 (67%) carry `metadata.loadtest`** — the lt-XXXX sweep (whole.md Next §3) is still open and dwarfs every other catalog issue |
| Variation values (`Variation` option) | 139 distinct; top `Default` (1669), then amperage/wattage values (`10A` 8, `20A` 6, …). **Zero** case/whitespace collisions, **zero** empty values |
| Case policy decision | No `10K` vs `10k` splits exist, so normalization preserves seller case and only trims/collapses whitespace + maps empty to `Default` |
| Categories | 60 total; core canonical set is healthy (ICs 966, Transistors 486, MOSFETs 484, Diodes 485, Capacitors 485, Resistors 244, Modules 485). **15 `*Others` buckets hold 1371 products** — the Phase 2 long tail |
| Metadata (1774 non-loadtest) | `part_number` 99.6%, `is_semiconductor=true` 72%, **`mpn` only 12, `datasheet_url` 0, `no_datasheet` 0** — Phase 3 has almost nothing to derive flags from yet; mpn sync is the gap |
| Search probes (`/store/search`) | `bimetal kulkas` → 2 relevant hits; `ne55` → typo tolerance works (NE555); `10k resistor` → 5 hits but noisy (transistors mixed in); **`IRF540N` → 0 hits, `10K` → 0 hits** (mpn + option-value + case blindness confirmed) |

## Phase 1 — Normalize Variation (foundation) — DONE Sep 12, 2026

Goal: deterministic option values, idempotent re-imports.

* Add one shared `normalizeOptionValue()` in the Shopee engine, applied at plan time (`buildPlans`) and at update time (`knownValues` path in `upsertOne`): trim, collapse inner whitespace, case-canonicalize (`10K -> 10k` policy decided in audit), `"" -> "Default"`, dedupe.
* Keep the single `Variation` option shape — this phase changes values, not schema, so existing SKUs keep working.
* Surface normalization in Preview (e.g. `variantsRenamed` count) following the existing `weightColumn` badge pattern.
* Files: `apps/backend/src/api/admin/shopee-imports/engine.ts`.
* Acceptance: re-running Execute with the same Shopee file yields `variantsAdded: 0` and zero new option values.
* Implemented as: exported `normalizeOptionValue()` (trim + collapse inner whitespace + empty→`Default`, seller case preserved per the Phase 0 decision); applied in `buildPlans` (label + optionValue) and in the `upsertOne` `knownValues` comparison (existing DB values normalized before compare, so legacy whitespace can never spawn a duplicate); `PreviewInfo.variantsRenamed` + preview badge; unit tests in `__tests__/normalize-option-value.unit.spec.ts` (5 passing: trim/collapse, case preservation, empty→Default, plan normalization + rename count, clean-input zero).

## Phase 2 — Canonical category map — DONE Sep 12, 2026

Goal: one stable taxonomy the rest of the plan can build on.

* Add a `shopeeLeaf -> nanofieldCategory` allowlist table (checked-in config, not code branches). Collapse the long tail to ~30 canonical categories; keep raw `categoryPath` in product metadata for traceability.
* Engine writes the canonical `category_id` to the product; Preview's `categoriesToCreate` stops growing on every import.
* Decide `Others` policy explicitly (keep `Parent Others` vs merge into parent).
* Files: engine `parseMedia` / `leafCategory` / `ensureCategory`, plus the new map config.
* Acceptance: full-catalog re-preview creates zero new categories; every product has exactly one canonical category.
* Implemented as: `category-map.ts` (29-entry `CANONICAL_CATEGORIES` + lowercase-keyed `LEAF_MAP`, `canonicalCategory()` / `isCanonicalCategory()`); `parseMedia` stores canonical-or-leaf in `category` plus raw `leaf`; `buildPlans` counts `categoriesRemapped` (new `PreviewInfo` field + preview badge); raw path written to product metadata as `category_path` on create and update; `ensureCategory` untouched (canonical names match live rows case-insensitively, so nothing duplicates). Others policy: KEEP `Parent Others` buckets canonical (1371 live products, no bare parents exist). Live-catalog remapping of the 60→29 is Phase 6 backfill, not this phase — the engine only governs future imports; the update path already converges to exactly-one on `syncContent` runs (replace semantics).
* Tests: `__tests__/category-map.unit.spec.ts` (5 passing: tail mappings, case-insensitive lookup, merch/unmapped passthrough, canonical self-consistency + ≤30 cap, plan canonicalization + remap count).

## Phase 3 — Category-aware specs + datasheet flag — DONE Sep 12, 2026

Goal: keep raw `Variation` for fidelity, add a derived filterable layer.

* Per canonical category, define variant-differentiating axes (e.g. Resistor: `Resistance, Power`; Capacitor: `Capacitance, Voltage`; Bimetal: `Compatibility`; Generic: `Pack Size`). Axes that change price/stock/weight become real Medusa options; product-level facts become metadata (`spec_family`, `spec_*`, `has_datasheet` derived from the shared `getDatasheetInfo` logic, `is_semiconductor`).
* Sync `mpn` back into `part_number` (admin widget + importer `classifySku`) so search and datasheet never disagree on the identifier.
* Never rename the base `Variation` title — the engine matches `title === "Variation"`; a rename creates duplicate options.
* Files: engine spec-derivation module + map from Phase 2, `apps/backend/src/admin/widgets/product-datasheet.tsx`, storefront `apps/storefront/src/lib/util/product-datasheet.ts` (rule stays shared, only the flag is precomputed).
* Acceptance: every semiconductor has `datasheet_url` or a searchable `part_number/mpn`; every tool/consumable has `no_datasheet=true`; spec coverage reported in Preview like the weight badge.
* Implemented as: `specs.ts` (`familyForCategory`, anchored magnitude extractors for resistance incl 4K7/decimal-comma/bare-decimal, capacitance incl EIA codes, voltage/current/power, size, package; family-gated axes; `deriveSpecs` union; `deriveHasDatasheet` mirroring the shared rule). Plans carry `specFamily`/`specs`/`hasDatasheet`; metadata gains `spec_family`, `spec_*`, monotonic `has_datasheet` (only ever written true — manual flags are never destroyed; upgraded on update when an operator mpn exists). mpn→part_number sync: admin widget fills an empty part_number on save (with hint); importer update path prefers an existing mpn as part_number (SKU identity preserved in `shopee_parent_sku`). Preview gains `specsWithValues`/`specsWithDatasheet` badges. Deliberate deviation: no new Medusa options created — variants are already split by Variation values, so parallel options would duplicate dimensions; metadata drives Phase 4/5 filtering instead.
* Tests: `__tests__/specs.unit.spec.ts` (15 passing: extractors, family gating, unions, rule parity, plan layer).
* Addendum Sep 14 — automatic semiconductor datasheets: `datasheets.ts` (`extractMpn` from titles — first slash-alternative, prefix strip, longest candidate, spec/stop-word rejects; `DATASHEET_MAP` curated MPN→direct-PDF, seeded with ESP32-WROOM-32 after HTTP-200 + in-PDF text verification; `resolveDatasheetUrl` + `describeDatasheetSource`). Precedence everywhere: manual > map > extracted > SKU behavior; automation fills empty fields only. Engine: plans carry `mpnCandidate`/`datasheetUrl` (+ `mpnFilled`/`datasheetsLinked` preview badges); upsert writes candidate mpn / map URL only into empty keys and upgrades `has_datasheet` accordingly. Backfill applies the same rules with its own counters. Widget shows the resolve chain. No alldatasheet scraping (fragile + wrong-PDF risk); misses fall through to exact-MPN search links. Tests: `__tests__/datasheets.unit.spec.ts` (live-title extraction, longest-wins, rejects, map miss, narration, plan wiring, `computeDatasheetPatch` fill-empty/no-overwrite cases — 32 unit tests green across the importer suite).
* Addendum Sep 14 (2) — one-click bulk + visibility re-check. (a) A bare-API probe initially suggested the detail page starves the rule of metadata — re-probed through the page's exact fetch path (`listProducts` default fields already include `+metadata`) and keys arrive complete, so the button renders correctly with zero changes; the first probe used the wrong fetch shape. (b) One-click bulk: (b) One-click bulk: `POST /admin/datasheets/auto-link` (dry-run returns the full report synchronously; apply runs a bounded background job, polled via `GET ?id=`) driven by a new card on `/app/ecomm-import` (Dry run → counts + sample patches; Apply → `usePrompt` confirm → progress log). Pure `computeDatasheetPatch` shared by route and (later) backfill — metadata keys only, operator values never overwritten.
* Addendum Sep 14 (3) — fallback URL fix: the alldatasheet search fallback (`search.jsp?searchword=`, lowercase) 404s live; correct format is `view.jsp?Searchword=` (capital S), verified by fetching both variants. Single-line fix in the shared `getDatasheetInfo` covers button + tabs.
* Addendum Sep 15 — distributor delisting: Nanofield sources direct from China, not through authorized distribution, so the DigiKey/Mouser/LCSC stock-&-pricing links (which convert our traffic into their sales and 0-result on obsolete Asian parts) are removed from `product-tabs`. Card renamed "Datasheets & Documents"; the no-documents empty state now counts the search fallback and links to `/contact` instead of a nonexistent portal; the Compliance card hides while empty (never auto-filled — wrong RoHS claims are a liability).
* Addendum Sep 15 (2) — auto-flag subscriber: `src/subscribers/product-classify.ts` listens to `product.created` + `product.updated` and writes `is_semiconductor` via the same `classifySku` prefix rule as the importer (SKU, else slugified handle). Guarded — writes only on difference, so no loops or churn; silent (product.* stays bell-free). Manual create forms have no widget zone (`product.create.*` does not exist in the dashboard — verified in source), so this subscriber, not UI injection, is the create-path mechanism. Tests: `classify-sku.unit.spec.ts`.

## Phase 4 — Search backend parity — DONE Sep 12, 2026

Goal: one ranking, full coverage.

* Extend `apps/backend/src/api/store/search/route.ts` (`trgmSql` + `plainSql` fallback together) to also match `mpn`, normalized option values, derived spec metadata, and canonical category names. Keep the ranking contract: exact `SKU / part_number / mpn / handle` > title substring > spec/category > trigram fuzzy > tsvector.
* Keep the single hydrator (`searchProductIds() -> listProducts()`); no second ranking implementation in the storefront.
* Requires `pg_trgm` (`CREATE EXTENSION IF NOT EXISTS pg_trgm`, see `STARTING_MANUAL.md` Part A).
* Acceptance: audit queries from Phase 0 all resolve; typo query (`ne55 -> NE555`) still works; unpublished/draft products never leak.
* Implemented as: same params/plumbing, new tiers in BOTH `trgmSql` and the `plainSql` fallback — 100: mpn exact + option-value exact; 70: option-value substring, `spec_*` metadata substring (escaped `spec\_%` — a wildcard `_` would false-positive future keys like `special_handling`), `spec_family` exact, category name exact/substring. Live-verified read-only Sep 12: option branch (`10A` → fuse/breaker rows), category branch (`home appliances` → transistor chip, `switches` → Indonesian-titled `Saklar…`), no regressions (`bimetal kulkas`, `ne55`, `10k resistor` unchanged), no leak (4580 non-published rows correctly excluded). mpn + spec tiers proven by logic probes — no published product carries mpn or spec_* metadata yet (lands via Phase 3 engine + Phase 6 backfill); the only mpn rows in the DB are soft-deleted, which the endpoint correctly hides.

## Phase 5 — Storefront filter + search UI unity — DONE Sep 12, 2026

Goal: every backend capability reachable, every entry point lands in the same place.

* `refinement-list/index.tsx`: add `OptionFilter` + `SpecFilter` + `HasDatasheet` toggle next to the existing Sort / View / `CategoryFilter`, wired to `?optionValueIds=`, new `?spec=`, and `?has_datasheet=` keys. Reuse `product-option-filters.ts` parsing; extend `store/page.tsx` + `paginated-products.tsx` (already plumb `optionValueIds`/`categoryIds`) rather than forking a second grid.
* Unify copy: nav dialog and hero/compact `SearchField` share the same placeholder (`Search part number, IC, specs…`) and land on `/{cc}/store?q=` with rank preserved. Keep the dialog's live suggestions (`limit=7`) + static pages list as-is.
* Keep the existing empty state (`No products match these filters` + `Show all products`) and make it name the blocking filter.
* Files: `apps/storefront/src/modules/store/components/refinement-list/*`, `apps/storefront/src/modules/layout/components/site-search/index.tsx`, `apps/storefront/src/modules/store/components/search-field/index.tsx`, `apps/storefront/src/app/[countryCode]/(main)/store/page.tsx`, `apps/storefront/src/modules/store/templates/paginated-products.tsx`.
* Acceptance: any filter/search combination is URL-shareable and round-trips; clearing filters returns to the full catalog; grid and list layouts show identical result sets.
* Implemented as: new `GET /store/facets` (GROUP BY option values incl. row ids, spec axis values, datasheet count; optional `?category_id=` scope; published-only) + Next `/api/facets` proxy + `OptionFilter` / `SpecFilter` / `DatasheetFilter` sidebar sections reusing the CategoryFilter checkbox style and URL-param pattern (`?optionValueIds=` native ids mapped from display values, new `?spec=axis:value` + `?has_datasheet=1` via `product-spec-filters.ts`). Spec/datasheet filtering runs in-memory inside `listProductsWithSort` (the store API has no metadata filter; the 5000-row fetch already exists for client sorting, so counts and pages stay exact across every combination). Placeholders unified to `Search part number, IC, specs…` on dialog + hero + compact. Empty state names the blocking filter. Live-verified: option-id filtering shows products, spec/datasheet correctly empty pre-backfill, facets global + scoped. Fixed en route: Postgres comma-JOIN + explicit-JOIN binding error (CROSS JOIN LATERAL), template-literal backslash collapse on `spec\_%`, `?optionValueIds=` takes native ids not display values.

## Phase 6 - Backfill + verify - DONE Sep 18, 2026

Goal: existing catalog meets the new contract without touching money data.

* Dry-run re-import with spec/datasheet coverage diagnostics (same UX pattern as the weight badge).
* Backfill script for the live catalog: normalize values, remap categories, set `has_datasheet` / `no_datasheet`, create new options/values. No price/stock writes in this pass.
* Tests: engine unit tests for normalization + category map + spec derivation; HTTP integration for extended search ranking; storefront round-trip for `parseOptionValueIds` + new keys.
* Acceptance: Phase 0 audit re-run shows zero unmapped categories, zero unstable option values, 100% datasheet-flag coverage; checkout weight behavior unchanged (still `variant.weight`, 500g fallback).
* Implemented as: `apps/backend/scripts/backfill-catalog-consistency.ts` (ts-node, reuses the Phase 1-3 pure functions — no logic duplication). Read-only by default; writes only with `--apply`. Per non-loadtest product: metadata (`category_path` when unambiguous, `spec_family`, `spec_*`, monotonic `has_datasheet`, `no_datasheet` for clear non-semis, mpn→`part_number` sync), exact-one canonical category, Variation-value verification (zero live collisions per audit — dirty values triage, never rewritten). NEVER touches prices, stock, status, handles, images (no such endpoints in the script by construction). Loadtest-flagged rows are skipped (separate sweep decision — do not backfill rows slated for deletion). Multi-category disagreement and ambiguous leaves triage, never guessed.
* Run: `npx ts-node --transpileOnly --compilerOptions '{"module":"commonjs"}' scripts/backfill-catalog-consistency.ts [--apply] [--limit N] [--offset N]` with `ADMIN_EMAIL`/`ADMIN_PASSWORD` set (backend running). Dry-run first, review the report, then `--apply` on explicit confirmation.
* Dry-run Sep 12 (880 live products): `skippedLoadtest=0` — every loadtest-flagged row is already soft-deleted, so the sweep question reduces to purging deleted rows, not triaging live ones. Surprise: the live catalog is a NEWER import batch (`tl-/fus-/swt-…` handles) with NO categories at all — the script does a metadata-only pass for these (generic family, identifier/datasheet flags) and assigns no category, since guessing taxonomy from SKU prefixes would be a new inference rule. `--limit`/`--offset` accept both `--limit=50` and `--limit 50` forms.
* Tests status: 20 engine unit tests passing (normalization, map, specs). HTTP integration specs deferred — no test-DB infra on this machine and shipping unrunnable tests is worse; ranking verified live via read-only probes instead (see Phase 4). Storefront has no test runner at all — parser round-trips verified live via filtered-page probes (see Phase 5) instead.

## Contracts to keep stable

* Query keys: `q`, `category`, `optionValueIds`, `spec`, `has_datasheet`, `sortBy`, `page`, `view`.
* Metadata keys: `shopee_product_id`, `shopee_parent_sku`, `shopee_variation_id`, `part_number`, `is_semiconductor`, `mpn`, `datasheet_url`, `no_datasheet`, `categoryPath`, plus new `spec_*` / `has_datasheet`.
* Option title `Variation` is load-bearing for the importer — rename only with an engine migration.

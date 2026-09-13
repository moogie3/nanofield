# Catalog Consistency Phases — Variation, Category, Datasheet, Search

*Status: plan approved, not started. Goal: maximum consistency through the whole storefront — the same part is found the same way from nav search, catalog search, category filter, option filter, and datasheet filter.*

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

## Phase 1 — Normalize Variation (foundation)

Goal: deterministic option values, idempotent re-imports.

* Add one shared `normalizeOptionValue()` in the Shopee engine, applied at plan time (`buildPlans`) and at update time (`knownValues` path in `upsertOne`): trim, collapse inner whitespace, case-canonicalize (`10K -> 10k` policy decided in audit), `"" -> "Default"`, dedupe.
* Keep the single `Variation` option shape — this phase changes values, not schema, so existing SKUs keep working.
* Surface normalization in Preview (e.g. `variantsRenamed` count) following the existing `weightColumn` badge pattern.
* Files: `apps/backend/src/api/admin/shopee-imports/engine.ts`.
* Acceptance: re-running Execute with the same Shopee file yields `variantsAdded: 0` and zero new option values.

## Phase 2 — Canonical category map

Goal: one stable taxonomy the rest of the plan can build on.

* Add a `shopeeLeaf -> nanofieldCategory` allowlist table (checked-in config, not code branches). Collapse the long tail to ~30 canonical categories; keep raw `categoryPath` in product metadata for traceability.
* Engine writes the canonical `category_id` to the product; Preview's `categoriesToCreate` stops growing on every import.
* Decide `Others` policy explicitly (keep `Parent Others` vs merge into parent).
* Files: engine `parseMedia` / `leafCategory` / `ensureCategory`, plus the new map config.
* Acceptance: full-catalog re-preview creates zero new categories; every product has exactly one canonical category.

## Phase 3 — Category-aware specs + datasheet flag

Goal: keep raw `Variation` for fidelity, add a derived filterable layer.

* Per canonical category, define variant-differentiating axes (e.g. Resistor: `Resistance, Power`; Capacitor: `Capacitance, Voltage`; Bimetal: `Compatibility`; Generic: `Pack Size`). Axes that change price/stock/weight become real Medusa options; product-level facts become metadata (`spec_family`, `spec_*`, `has_datasheet` derived from the shared `getDatasheetInfo` logic, `is_semiconductor`).
* Sync `mpn` back into `part_number` (admin widget + importer `classifySku`) so search and datasheet never disagree on the identifier.
* Never rename the base `Variation` title — the engine matches `title === "Variation"`; a rename creates duplicate options.
* Files: engine spec-derivation module + map from Phase 2, `apps/backend/src/admin/widgets/product-datasheet.tsx`, storefront `apps/storefront/src/lib/util/product-datasheet.ts` (rule stays shared, only the flag is precomputed).
* Acceptance: every semiconductor has `datasheet_url` or a searchable `part_number/mpn`; every tool/consumable has `no_datasheet=true`; spec coverage reported in Preview like the weight badge.

## Phase 4 — Search backend parity

Goal: one ranking, full coverage.

* Extend `apps/backend/src/api/store/search/route.ts` (`trgmSql` + `plainSql` fallback together) to also match `mpn`, normalized option values, derived spec metadata, and canonical category names. Keep the ranking contract: exact `SKU / part_number / mpn / handle` > title substring > spec/category > trigram fuzzy > tsvector.
* Keep the single hydrator (`searchProductIds() -> listProducts()`); no second ranking implementation in the storefront.
* Requires `pg_trgm` (`CREATE EXTENSION IF NOT EXISTS pg_trgm`, see `STARTING_MANUAL.md` Part A).
* Acceptance: audit queries from Phase 0 all resolve; typo query (`ne55 -> NE555`) still works; unpublished/draft products never leak.

## Phase 5 — Storefront filter + search UI unity

Goal: every backend capability reachable, every entry point lands in the same place.

* `refinement-list/index.tsx`: add `OptionFilter` + `SpecFilter` + `HasDatasheet` toggle next to the existing Sort / View / `CategoryFilter`, wired to `?optionValueIds=`, new `?spec=`, and `?has_datasheet=` keys. Reuse `product-option-filters.ts` parsing; extend `store/page.tsx` + `paginated-products.tsx` (already plumb `optionValueIds`/`categoryIds`) rather than forking a second grid.
* Unify copy: nav dialog and hero/compact `SearchField` share the same placeholder (`Search part number, IC, specs…`) and land on `/{cc}/store?q=` with rank preserved. Keep the dialog's live suggestions (`limit=7`) + static pages list as-is.
* Keep the existing empty state (`No products match these filters` + `Show all products`) and make it name the blocking filter.
* Files: `apps/storefront/src/modules/store/components/refinement-list/*`, `apps/storefront/src/modules/layout/components/site-search/index.tsx`, `apps/storefront/src/modules/store/components/search-field/index.tsx`, `apps/storefront/src/app/[countryCode]/(main)/store/page.tsx`, `apps/storefront/src/modules/store/templates/paginated-products.tsx`.
* Acceptance: any filter/search combination is URL-shareable and round-trips; clearing filters returns to the full catalog; grid and list layouts show identical result sets.

## Phase 6 — Backfill + verify

Goal: existing catalog meets the new contract without touching money data.

* Dry-run re-import with spec/datasheet coverage diagnostics (same UX pattern as the weight badge).
* Backfill script for the live catalog: normalize values, remap categories, set `has_datasheet` / `no_datasheet`, create new options/values. No price/stock writes in this pass.
* Tests: engine unit tests for normalization + category map + spec derivation; HTTP integration for extended search ranking; storefront round-trip for `parseOptionValueIds` + new keys.
* Acceptance: Phase 0 audit re-run shows zero unmapped categories, zero unstable option values, 100% datasheet-flag coverage; checkout weight behavior unchanged (still `variant.weight`, 500g fallback).

## Contracts to keep stable

* Query keys: `q`, `category`, `optionValueIds`, `spec`, `has_datasheet`, `sortBy`, `page`, `view`.
* Metadata keys: `shopee_product_id`, `shopee_parent_sku`, `shopee_variation_id`, `part_number`, `is_semiconductor`, `mpn`, `datasheet_url`, `no_datasheet`, `categoryPath`, plus new `spec_*` / `has_datasheet`.
* Option title `Variation` is load-bearing for the importer — rename only with an engine migration.

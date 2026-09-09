# Nanofield — Precision Electronic Components

Nanofield is a standalone ecommerce store for semiconductors, electronic components, and appliance spare parts (successor to the Shopee/TikTok "Toko Sanjaya" listings). B2C first, with B2B held in reserve.

Built on the [Medusa DTC Starter](https://github.com/medusajs/dtc-starter) (Medusa v2 backend + Next.js storefront, Turborepo monorepo). Custom work on top includes a Shopee Excel importer with admin UI, a full admin branding suite, datasheet-backed product pages, and a schematic-themed storefront.

Project docs:

- `whole.md` — whole-project state: architecture, what is built, conventions, gotchas
- `nanofield_ecommerce_plan.md` — business/catalog plan, decision log, import checklist
- `STARTING_MANUAL.md` — fresh-clone to working-checkout manual: setup order, Definition of Ready gates, admin reference
- `ARCHITECTURE.md` — system sketch: backend, storefront, RajaOngkir, Shopee pipeline, and how they connect
- `AGENTS.md` — contributor commands, package-manager rules, code style

## Repository layout

```text
apps/backend      Medusa v2 API + admin (@nanofield/backend, :9000, admin at /app)
apps/storefront   Next.js storefront (:8000, default region id)
```

## Prerequisites

- Node.js v20+
- PostgreSQL v15+ (create an empty database, e.g. `nanofield`)
- Redis (default `redis://localhost:6379`)
- npm 11 — this install uses npm (`package-lock.json` at root, `packageManager: npm@11.0.0`). Use npm for every command; never introduce a second lockfile.

## Setup from a fresh clone

```bash
git clone <repo-url> nanofield
cd nanofield
npm install
```

### 1. Backend environment

```bash
cp apps/backend/.env.template apps/backend/.env
```

Edit `apps/backend/.env` and set at minimum:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgres://<user>:<password>@localhost:5432/nanofield` |
| `JWT_SECRET` / `COOKIE_SECRET` | long random strings (dev defaults in the template are NOT safe to share) |
| `STOREFRONT_URL` | `http://localhost:8000` |
| `REVALIDATE_SECRET` | long random string, must match the storefront's copy (enables instant catalog cache purge, see below) |

`STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` and `REDIS_URL` already default to local values in the template.

### 2. Migrate the database and create an admin user

A fresh clone ships with **no administrator account** (there is no interactive `create-medusa-app` setup to generate one). The account must be created explicitly — every backend script (catalog seed, shipping setup, Shopee importer CLI) authenticates as this user, so nothing scripted can run before this step:

```bash
cd apps/backend
npx medusa db:migrate
npx medusa user -e admin@test.com -p <choose-a-password>
cd ../..
```

### 3. Start the backend

```bash
npm run backend:dev
```

Wait for `Medusa is ready`, then open `http://localhost:9000/app` and log in. Go to Settings and create/copy a **publishable API key** — the storefront needs it next.

### 4. Storefront environment

Create `apps/storefront/.env.local` (there is no template file; these are the keys):

```bash
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<key from step 3>
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=id
NEXT_PUBLIC_BASE_URL=http://localhost:8000
REVALIDATE_SECRET=<same value as backend>
```

Without the publishable key, storefront API calls fail with a publishable-key error (not an obvious 401).

### 5. Start the storefront

```bash
npm run storefront:dev
```

Open `http://localhost:8000/dk/store`. Or run everything at once from the root with `npm run dev`.

### 6. Load catalog data (pick one)

- **Demo seed (12 semiconductor SKUs, placeholder prices)** — proves the metadata-to-UI path: with the backend running, run the seeder in `apps/backend` (see `nanofield_ecommerce_plan.md` Section 0 for script details).
- **Real catalog (Shopee Excel exports)** — open the admin at `/app/ecomm-import`, upload the sales/basic/media/shipping workbooks, run **Preview** first (validates without writing), then **Execute**. The same pipeline is drivable from the CLI (`apps/backend/scripts/import-shopee.mjs`). Clean out demo/seed and loadtest products before the real import (see plan Section 6 for SKU collisions to resolve first).

## Everyday commands

Run from the repo root unless noted (`<pm>` = npm here):

| Task | Command |
|---|---|
| Develop everything | `npm run dev` |
| Backend only (:9000) | `npm run backend:dev` |
| Storefront only (:8000) | `npm run storefront:dev` |
| Build / start | `npm run build` / `npm run start` |
| Lint all | `npm run lint` |
| Backend unit tests | `cd apps/backend && npm run test:unit` |
| Backend HTTP integration tests | `cd apps/backend && npm run test:integration:http` |
| Generate migration for a custom module | `cd apps/backend && npx medusa db:generate <module-name>` |
| Run migrations | `cd apps/backend && npx medusa db:migrate` |

## Catalog cache behavior (read this before reporting "stale" data)

- The storefront caches products/categories with a 5-minute ISR window (`revalidate: 300`).
- When `STOREFRONT_URL` + matching `REVALIDATE_SECRET` are configured, product create/update/delete events in the backend automatically purge the storefront cache via `POST /api/catalog/revalidate`. Category changes are NOT auto-purged (5-minute window applies).
- To flush everything immediately, restart the storefront dev server.
- Never hand-edit `package-lock.json`; never commit `.env` files (`*.xlsx` imports at root are git-ignored).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Storefront API calls fail / empty catalog | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` missing or wrong in `apps/storefront/.env.local`; restart the storefront after changing env |
| Admin shows a blank page on first load | clear the Vite dependency cache and reload |
| Deleted products/categories still visible | wait out the 5-minute ISR window, check `REVALIDATE_SECRET` matches on both sides, or restart the storefront |
| `tsc --noEmit` reports TS2786 across the storefront | pre-existing React-types noise; filter output to the files you touched |
| Port already in use | backend needs :9000, storefront :8000 — stop the other process first |

## Resources

- [Medusa Documentation](https://docs.medusajs.com)
- [Medusa Admin User Guide](https://docs.medusajs.com/user-guide)

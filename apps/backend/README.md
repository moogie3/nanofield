# Nanofield Backend

Medusa-powered commerce backend for Nanofield — precision electronic components and appliance spare parts (B2C-first, B2B-ready).

- Admin dashboard: `http://localhost:9000/app`
- Store API: `http://localhost:9000/store`
- Built with Medusa v2 (MIT-licensed, see the root `LICENSE`). Framework docs: https://docs.medusajs.com

## Develop

```bash
# from the repo root (npm is the package manager — see root package.json)
npm run backend:dev
```

## Conventions

- Business logic belongs in workflows (`src/workflows/`), not in route handlers.
- API routes are file-based (`src/api/store/*`, `src/api/admin/*`).
- Custom commerce logic lives in modules (`src/modules/`) with migrations generated via `npx medusa db:generate <module>`.
- Product spec fields (manufacturer, datasheet, package, ratings) are stored in Medusa `metadata` and rendered by the storefront — see `apps/backend/seed-semiconductors.mjs` for the reference shape.

## Useful commands

```bash
npx medusa db:migrate
npx medusa user -e admin@test.com -p supersecret
ADMIN_EMAIL=... ADMIN_PASSWORD=... node seed-semiconductors.mjs
```

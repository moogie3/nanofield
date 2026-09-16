# DEPLOY.md — Production: Vercel storefront + Railway backend

Target topology:

| Piece | Where | Notes |
|---|---|---|
| Storefront (Next.js) | Vercel | Root Directory `apps/storefront` |
| Backend (Medusa) | Railway | Docker, `apps/backend/Dockerfile`, context = repo root |
| PostgreSQL 15+ | Railway plugin | Private URL for the backend |
| Redis | Railway plugin | Optional in dev (memory fallback), **required in prod** |
| Product images | Railway volume | Mounted at `/app/apps/backend/static` |

## Part 1 — Backend on Railway

1. New project → **Postgres** plugin → **Redis** plugin → **Empty Service** → connect this repo.
2. Service settings: **Root Directory empty (repo root)**, **Dockerfile Path `apps/backend/Dockerfile`**.
   (The Dockerfile needs the root lockfile, so the context must stay at the repo root.)
3. Add a **Volume** mounted at `/app/apps/backend/static` — without it every
   redeploy wipes product images (file-local provider stores uploads under `<cwd>/static`).
4. Set variables (generate fresh secrets — never copy dev values for the `*SECRET*` rows):

| Variable | Production value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (private URL if same project) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `JWT_SECRET` / `COOKIE_SECRET` / `REVALIDATE_SECRET` | Fresh long random strings |
| `STORE_CORS` | `https://<store-domain>` |
| `ADMIN_CORS` | `https://<backend-domain>` (serves `/app`) |
| `AUTH_CORS` | `https://<store-domain>,https://<backend-domain>` |
| `STOREFRONT_URL` | `https://<store-domain>` |
| `RAJAONGKIR_API_KEY` / `RAJAONGKIR_BASE_URL` / `RAJAONGKIR_ORIGIN_ID` | Live key + `https://rajaongkir.komerce.id/api/v1` + `19363` |
| `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` | **Live** keys |
| `MIDTRANS_IS_PRODUCTION` | `true` |
| `RESEND_API_KEY` / `RESEND_FROM` | Live key + verified sender (sole active email provider) |
| `TRACKING_SYNC_ENABLED` | `true` (keep the per-run cap small — shares the 100 hits/day RajaOngkir quota) |
| `STORE_NAME` / `STORE_PHONE` / `STORE_ADDRESS_1` / `STORE_CITY` / `STORE_PROVINCE` / `STORE_COUNTRY_CODE` | Sender block printed on shipping labels |

Do **not** set any `MAILTRAP_*` variable in production — leaving
`MAILTRAP_USER` empty keeps the sandbox provider dormant.

5. Deploy. The container runs `medusa db:migrate && medusa start`, so
   migrations apply themselves on every boot.
6. One-off setup via the Railway CLI (`railway link` first):
   `railway run --service <svc> npx medusa user -e <admin-email> -p <password>`
   then log in at `https://<backend-domain>/app` and create the **production
   publishable key** (needed for Part 2).
7. Attach the custom domain (e.g. `api.nanofield.com`) and re-check the three
   `*_CORS` rows against the final domains.

## Part 2 — Storefront on Vercel

1. Import the repo → **Root Directory `apps/storefront`** → framework auto-detected.
2. Environment variables (Production):

| Variable | Production value |
|---|---|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `https://<backend-domain>` |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Production key from Part 1 step 6 |
| `NEXT_PUBLIC_DEFAULT_REGION` | `id` |
| `NEXT_PUBLIC_BASE_URL` | `https://<store-domain>` |
| `REVALIDATE_SECRET` | Identical to the backend row |

3. Attach the store domain. Vercel redeploys automatically on push.

## Part 3 — Go-live flips (all in the Midtrans/RajaOngkir dashboards plus env)

- Midtrans: switch to live keys, set `MIDTRANS_IS_PRODUCTION=true`, register
  `https://<backend-domain>/hooks/payment/midtrans` as the notification URL,
  run one real sub-Rp10.000 payment end to end.
- RajaOngkir: live key in, confirm a checkout quote returns a live tariff
  (not the `RAJAONGKIR_FALLBACK_AMOUNT` flat rate).
- Resend: domain verified, test order email lands in inbox (not spam).
- Tracking sync: confirm the `tracking-sync` job marks an in-transit order
  delivered without exhausting the daily quota.

## Verify / rollback / troubleshoot

- Verify: storefront loads over HTTPS, cart → Snap → Midtrans sandbox-then-live
  payment captures, `/admin/orders/[id]` prints a thermal label, order
  confirmation email arrives, `tracking-sync` logs one clean run.
- Rollback: Railway → Deployments → redeploy previous; Vercel → Deployments →
  Promote to Production. Database migrations are forward-only — never roll back
  the database without an explicit backup restore.
- Healthcheck fails to bind: Railway injects `PORT` automatically; if the
  service stays unhealthy, set `PORT=9000` explicitly and redeploy.
- Images 404 after redeploy: the volume is missing or mounted at the wrong
  path — it must be exactly `/app/apps/backend/static`.
- Publishable-key errors from the storefront: the key belongs to another
  environment — recreate it in the production admin.

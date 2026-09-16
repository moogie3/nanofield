# Nanofield backend (Medusa) — production image.
#
# Build context MUST be the repo root (Railway: leave Root Directory empty
# and set Dockerfile Path to apps/backend/Dockerfile), because install and
# build resolve through the root package-lock workspace.
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY package.json turbo.json ./
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
# Produces .medusa/server + the compiled admin bundle.
RUN npm run build
# Drop devDependencies for a slimmer runtime image.
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app/apps/backend
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/package.json ./
COPY --from=build /app/apps/backend/medusa-config.ts ./
COPY --from=build /app/apps/backend/.medusa ./.medusa
COPY --from=build /app/apps/backend/src ./src
# Uploads live under <cwd>/static (file-local provider default).
# Mount a Railway volume here or product images vanish on redeploy.
VOLUME ["/app/apps/backend/static"]
EXPOSE 9000
# Migrations are idempotent — safe to run on every boot before serving.
CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]

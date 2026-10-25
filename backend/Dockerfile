# Backend image for production (DECISIONS §3). One image, two programs:
#   api   → node dist/apps/campusly-api/main   (GraphQL + /auth, port 3000)
#   batch → node dist/apps/campusly-batch/main (BullMQ jobs + cron, no port)
# Built on the EC2 box itself: docker compose -f docker-compose.prod.yml build
#
# Multi-stage: the "build" stage has every dev tool (TypeScript, webpack, tsx for the seed);
# the final "runtime" stage gets only the compiled code and the production dependencies.

# ── base: Node + pnpm (the version comes from "packageManager" in package.json) ──
FROM node:24-bookworm-slim AS base
# openssl: Prisma's migration engine needs it
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ── build: all dependencies + compile both apps ──
FROM base AS build
# Dependencies first: this layer is cached until the lockfile changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma7.config.ts ./
COPY prisma ./prisma
# postinstall runs `prisma generate` → generated/prisma
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY apps ./apps
RUN pnpm build && pnpm build:batch
# This stage is also the "tools" image for one-off commands (migrate deploy, seed):
# it has the Prisma CLI with its engines, tsx and dotenv. See docker-compose.prod.yml.

# ── prod-deps: only "dependencies", no dev tools ──
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# --ignore-scripts: skip `prisma generate` (the client is already compiled into dist by webpack)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# ── runtime: what actually runs on the server ──
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Do not run as root inside the container (the image's built-in "node" user)
USER node
EXPOSE 3000
CMD ["node", "dist/apps/campusly-api/main"]

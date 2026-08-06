# syntax=docker/dockerfile:1
# Multi-stage build for the Shieldwise API (NestJS).

FROM node:25-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- deps: install the full workspace so pnpm can resolve internal packages
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @shieldwise/api... 2>/dev/null || pnpm install --filter @shieldwise/api...

# ---- build
FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY package.json pnpm-workspace.yaml ./
RUN pnpm --filter @shieldwise/shared run build
RUN pnpm --filter @shieldwise/api run build

# ---- runtime: prod deps only, non-root user, no build toolchain
FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup -g 1001 shieldwise && adduser -D -u 1001 -G shieldwise shieldwise
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod --filter @shieldwise/api... 2>/dev/null || pnpm install --prod --filter @shieldwise/api...
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY apps/api/prisma apps/api/prisma
COPY apps/api/tsconfig.json apps/api/tsconfig.json
RUN cd apps/api && pnpm exec prisma generate
USER shieldwise
WORKDIR /repo/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- http://127.0.0.1:4000/v1/health || exit 1
CMD ["node", "dist/main.js"]

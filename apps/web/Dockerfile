# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @shieldwise/web... 2>/dev/null || pnpm install --filter @shieldwise/web...

FROM base AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY packages/shared packages/shared
COPY apps/web apps/web
COPY package.json pnpm-workspace.yaml ./
RUN pnpm --filter @shieldwise/shared run build
RUN pnpm --filter @shieldwise/web run build

FROM base AS runtime
ENV NODE_ENV=production
# Next's standalone server.js does `process.env.HOSTNAME || '0.0.0.0'` to pick
# its bind address. Docker sets HOSTNAME to the container ID by default, which
# resolves to the container's own bridge IP — binding the server there instead
# of the wildcard address, so only Docker's port-mapped DNAT can reach it and
# anything hitting localhost/127.0.0.1 from inside the container (e.g. the
# HEALTHCHECK below) gets connection refused. Force the wildcard explicitly.
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 shieldwise && adduser -D -u 1001 -G shieldwise shieldwise
WORKDIR /repo/apps/web
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER shieldwise
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- http://127.0.0.1:3000 || exit 1
CMD ["node", "apps/web/server.js"]

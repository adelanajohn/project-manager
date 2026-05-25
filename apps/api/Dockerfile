FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@8.15.4

# Dependencies
FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Build shared packages
FROM deps AS builder
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm --filter @pm/shared build
RUN pnpm --filter @pm/api build

# Runtime
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@8.15.4
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/config ./packages/config
COPY --from=deps /app/packages/shared ./packages/shared
COPY --from=deps /app/packages/db ./packages/db
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/package.json ./apps/api/

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]

# New Developer Onboarding

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 8+ | `npm i -g pnpm` |
| Docker Desktop | Latest | https://docker.com |
| Git | Any | https://git-scm.com |

## Clone & Install

```bash
git clone https://github.com/adelanajohn/project-manager.git
cd project-manager
pnpm install
```

## Generate JWT Keys

The API uses RS256 asymmetric JWT signing. You need to generate a key pair once:

```bash
# Generate private key
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048

# Extract public key
openssl rsa -pubout -in private.pem -out public.pem

# Base64-encode both (copy these into your .env)
node -e "
  const fs = require('fs');
  console.log('JWT_PRIVATE_KEY=' + Buffer.from(fs.readFileSync('private.pem')).toString('base64'));
  console.log('JWT_PUBLIC_KEY=' + Buffer.from(fs.readFileSync('public.pem')).toString('base64'));
"

# Clean up key files (never commit them)
rm private.pem public.pem
```

## Environment Setup

```bash
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env
```

Fill in `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` in `apps/api/.env`. All other defaults work for local dev.

## Start Infrastructure

```bash
# Postgres + Redis via Docker
docker compose up -d postgres redis
```

Wait for both to be healthy:
```bash
docker compose ps
```

## Database Setup

```bash
# Generate Prisma client types
pnpm --filter @pm/db generate

# Run all migrations
pnpm --filter @pm/db migrate

# Seed demo data (creates admin user + demo org)
pnpm --filter @pm/db seed
```

## Start Development Servers

```bash
pnpm dev
```

Turborepo starts all three apps concurrently:

| App | URL | Description |
|-----|-----|-------------|
| Web | http://localhost:5173 | React SPA |
| API | http://localhost:3000 | Fastify REST + WebSocket |
| API Docs | http://localhost:3000/docs | Swagger UI |

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | admin@platform.dev | Password123! |
| Demo Admin | demo@acme.dev | Password123! |
| Demo Member | member@acme.dev | Password123! |

## Project Structure

```
apps/
  api/        Fastify API server
    src/
      routes/     Route handlers (thin — call services)
      services/   Business logic + DB queries
      plugins/    Fastify plugins (auth, correlationId)
      middleware/ Request middleware
      queues/     BullMQ queue instances
  web/        React + Vite SPA
    src/
      pages/      Page components (organized by feature)
      components/ Shared UI components
      stores/     Zustand state stores
      hooks/      Custom React hooks
      lib/        API client + utilities
  worker/     BullMQ job processors
    src/
      processors/ One file per queue
packages/
  shared/     Zod schemas, types, RBAC permissions
  db/         Prisma schema + client + seed
  ui/         Shared component library (Button, Card, Gantt…)
  config/     ESLint, TypeScript, Tailwind base configs
```

## Common Commands

```bash
# Build all
pnpm build

# Typecheck all
pnpm typecheck

# Lint all
pnpm lint

# Run tests
pnpm test

# Generate Prisma client after schema change
pnpm --filter @pm/db generate

# Create a new migration
pnpm --filter @pm/db -- prisma migrate dev --name <migration-name>

# Reset DB (dev only)
pnpm --filter @pm/db migrate:reset

# Open Prisma Studio
pnpm --filter @pm/db studio
```

## Adding a New API Endpoint

1. Add a Zod schema to `packages/shared/src/schemas/`
2. Add a service method to `apps/api/src/services/`
3. Add a route to `apps/api/src/routes/` and register it in `app.ts`
4. Update `packages/shared/src/index.ts` if exporting new schemas

## Adding a New BullMQ Job

1. Add the queue to `apps/api/src/queues/index.ts`
2. Create `apps/worker/src/processors/<queue>.processor.ts`
3. Register it in `apps/worker/src/index.ts`

## Code Style

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Formatting**: Prettier (auto on save via VSCode settings)
- **Linting**: ESLint with `@pm/config/eslint-preset`
- **TypeScript**: Strict mode. No `any` unless unavoidable.

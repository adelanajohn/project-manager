# Project Manager

A multi-tenant agile project management SaaS — think Linear meets Jira, built for startup teams.

## Architecture

```
apps/
  web/      React + TypeScript (Vite) — Frontend SPA
  api/      Fastify + TypeScript    — REST API + Socket.IO
  worker/   BullMQ workers          — Background job processing
packages/
  shared/   Zod schemas, types, RBAC permissions
  db/       Prisma schema + migrations + seed
  config/   ESLint, TypeScript, Tailwind configs
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, Framer Motion, Recharts |
| State | TanStack Query v5, Zustand |
| Backend | Fastify 4, TypeScript |
| Database | PostgreSQL 16 with RLS |
| ORM | Prisma 5 |
| Cache / Queue | Redis 7, BullMQ 5 |
| Auth | JWT RS256, bcrypt, HttpOnly cookies |
| Real-time | Socket.IO with Redis adapter |

## Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop
- pnpm 8+

### Setup

```bash
git clone <repo>
cd project-manager
pnpm install
```

### Generate JWT Keys

```bash
# Generate RS256 key pair
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private.pem -out public.pem

# Base64 encode for .env
node -e "const fs = require('fs'); console.log('PRIVATE:', Buffer.from(fs.readFileSync('private.pem')).toString('base64')); console.log('PUBLIC:', Buffer.from(fs.readFileSync('public.pem')).toString('base64'))"
```

### Configure Environment

```bash
cp apps/api/.env.example apps/api/.env
# Fill in JWT_PRIVATE_KEY and JWT_PUBLIC_KEY with base64-encoded keys above
```

### Start Infrastructure

```bash
docker compose up -d postgres redis
```

### Run Migrations & Seed

```bash
pnpm --filter @pm/db generate
pnpm --filter @pm/db migrate
pnpm --filter @pm/db seed
```

### Start Development

```bash
pnpm dev
```

This starts:
- Web:     http://localhost:5173
- API:     http://localhost:3000
- Docs:    http://localhost:3000/docs (Swagger UI)

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | admin@platform.dev | Password123! |
| Demo Admin | demo@acme.dev | Password123! |
| Demo Member | member@acme.dev | Password123! |

## RBAC Model

### Platform Roles
| Role | Access |
|------|--------|
| `platform_admin` | Full superadmin — all tenants, impersonation, billing |
| `platform_support` | Read-only access to all tenants |

### Tenant Roles
| Role | Access |
|------|--------|
| `tenant_admin` | Full org control (members, billing, settings) |
| `tenant_manager` | Projects, sprints, analytics — no billing |
| `tenant_member` | Create/edit own issues, comment |
| `tenant_viewer` | Read-only |
| `tenant_guest` | Access to specific projects only |

## Security

- JWT RS256 access tokens (15 min) + refresh tokens (7 days, HttpOnly cookies)
- Refresh token rotation with token family theft detection
- Account lockout after 5 failed login attempts (15 min)
- Password policy: 12+ chars, uppercase, lowercase, number
- Triple-layer tenant isolation: JWT orgId → Prisma middleware → PostgreSQL RLS
- Rate limiting: 200 req/min global, 10 req/min on auth endpoints
- Helmet.js security headers, strict CORS

## Running Tests

```bash
pnpm test              # all tests
pnpm --filter @pm/api test  # API unit tests
```

## Docker (Production)

```bash
docker compose -f docker-compose.prod.yml up -d
```

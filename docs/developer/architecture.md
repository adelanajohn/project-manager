# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                │
│              React SPA (Vite, TanStack Query, Zustand)         │
└──────────┬──────────────────────────────────┬───────────────────┘
           │ HTTP (REST/JSON)                 │ WebSocket
           ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Fastify API (Node.js)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │  Auth    │ │  RBAC    │ │  Routes  │ │  Socket.IO Server │   │
│  │  Plugin  │ │  Plugin  │ │ /api/v1  │ │  (Redis adapter)  │   │
│  └──────────┘ └──────────┘ └────┬─────┘ └───────────────────┘   │
│                                 │ Prisma ORM + RLS middleware   │
└─────────────────────────────────┼───────────────────────────────┘
           │                      │
           │ BullMQ jobs          │
           ▼                      ▼
┌─────────────────┐    ┌─────────────────────────────────────────┐
│  BullMQ Worker  │    │           PostgreSQL 16                 │
│  ┌───────────┐  │    │  ┌─────────┐  ┌──────────┐  ┌───────┐   │
│  │Notif queue│  │    │  │  Tables │  │   RLS    │  │ GIN   │   │
│  │Email queue│  │    │  │ + orgId │  │ Policies │  │indexes│   │
│  │Audit queue│  │    │  └─────────┘  └──────────┘  └───────┘   │
│  │Analytics  │  │    └─────────────────────────────────────────┘
│  └───────────┘  │
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│   Redis 7        │
│  • BullMQ queues │
│  • Rate limiting │
│  • Token cache   │
│  • Socket.IO pub │
└──────────────────┘
```

## Request Lifecycle

Every HTTP request flows through these layers in order:

```
1. CORS / Helmet headers
2. Rate limiter (Redis sliding window)
3. Correlation ID injection (X-Correlation-Id header)
4. JWT verification → request.jwtPayload
5. Route handler
6. Service layer (RBAC check via can())
7. Prisma query (orgId always injected → RLS enforces isolation)
8. BullMQ jobs queued async (notifications, audit, search index)
9. JSON response with standard envelope
```

## Multi-Tenancy

Three independent layers ensure tenant data isolation:

| Layer | Mechanism | What it stops |
|-------|-----------|---------------|
| Application | `orgId` from JWT, never from request body | Forged org params |
| ORM | Prisma middleware injects `orgId` on every query | Accidental cross-org reads |
| Database | PostgreSQL RLS policies per table | Compromised app code |

The RLS session variables are set at transaction start:
```sql
SELECT set_config('app.current_org_id', $1, true),
       set_config('app.current_user_id', $2, true),
       set_config('app.current_role', $3, true)
```

## WebSocket Architecture

```
Client → Socket.IO handshake (JWT in auth.token)
       → Server validates JWT
       → Auto-joins org room: org:<orgId>
       → On demand joins project room: project:<projectId>

Event flow:
  API handler → updates DB
              → emitToProject(projectId, 'issue.updated', payload)
              → Socket.IO → Redis pub/sub
              → all connected clients in that room receive event
              → TanStack Query cache updated client-side
```

## Background Jobs

All queues are backed by Redis BullMQ. Workers run as a separate Node process.

```
HTTP Request
  ↓ issue created
  ↓ notificationQueue.add('issue-created', { issueId, orgId, actorId })
  ↓ auditQueue.add('log', { action: 'issue.created', ... })
  ↓ searchIndexQueue.add('index', { type: 'issue', id })

Worker picks up jobs concurrently (concurrency: 5 per queue):
  notifications → create Notification rows → Socket.IO push
  email         → render template → SMTP send
  audit         → write to audit_logs table
  search-index  → update tsvector / pg_trgm index
  analytics     → recompute burndown cache in Redis
  cleanup       → purge soft-deleted rows older than 30 days
```

Failed jobs retry with exponential backoff. After max retries they go to the DLQ.

## RBAC

Permissions are evaluated by the `can(user, action)` utility in `packages/shared/permissions.ts`.

The function receives a `UserContext` with three optional roles:
- `platformRole` — set for superadmins crossing tenant boundaries
- `tenantRole` — the user's role within the current org
- `projectRole` — optional override at the project level (`project_lead`)

Platform admins bypass all tenant checks. Project leads gain sprint management within their project.

See [rbac.md](../security/rbac.md) for the full permission matrix.

## Package Dependency Graph

```
apps/web   ──→  packages/shared
               packages/ui
apps/api   ──→  packages/shared
               packages/db
apps/worker ──→ packages/shared
               packages/db
packages/db ──→ @prisma/client
```

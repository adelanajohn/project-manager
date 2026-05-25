# LLM Prompt: Multi-Tenant Agile Project Management App for Startup Teams


---

## Overview

Build a **multi-tenant agile project management SaaS application** tailored for startup teams. The product should feel as fast and opinionated as Linear, as visually polished as Vercel's dashboard, as flexible as Notion for documentation, and as feature-rich as Jira for agile workflows — without the complexity that makes large-enterprise tools feel bloated.

The app must support multiple organizations (tenants) sharing the same infrastructure with strict data isolation, a stunning UI with full dark mode, real-time collaboration, rich data visualizations, background job processing, comprehensive security at every layer, and structured observability throughout.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + TypeScript (Fastify) |
| Job Queue | BullMQ (Redis-backed) |
| Database | PostgreSQL (with RLS enabled) |
| ORM | Prisma |
| Auth | JWT (access + refresh tokens), bcrypt |
| Real-time | Socket.io (WebSockets) |
| Cache | Redis |
| File Storage | S3-compatible (AWS S3 or MinIO) |
| Logging | Pino (structured JSON) + OpenTelemetry |
| UI | shadcn/ui + Tailwind CSS + Framer Motion |
| Charts | Recharts + react-gantt (custom Gantt) |


---

## UI / Visual Design System

### Design Philosophy
The UI must be **beautiful, modern, and highly polished** — not a generic CRUD app. Every screen should feel intentional, with careful use of spacing, typography, color, and motion.

### Theme & Dark Mode
- Full **dark mode / light mode** toggle, persisted per user in DB and `localStorage`.
- Dark mode palette: deep navy/slate backgrounds (`#0A0E1A`, `#0F1629`), card surfaces (`#141B2D`, `#1A2237`), borders (`#1E2D45`), muted text (`#64748B`).
- Light mode palette: clean whites, `#F8FAFC` backgrounds, `#E2E8F0` borders.
- Accent colors: electric indigo (`#6366F1`) primary, violet (`#8B5CF6`) secondary, cyan (`#06B6D4`) highlight, rose (`#F43F5E`) for danger/urgent.
- CSS variables for all tokens, switching via `data-theme` attribute on `<html>`.
- All shadcn/ui components styled with custom Tailwind theme to match the palette above.

### Typography
- Font: **Inter** (body + UI), **JetBrains Mono** (code blocks, issue keys, metrics).
- Typographic scale: 12/14/16/20/24/32/48px with consistent line-heights.

### Component Library
Build a shared `packages/ui` library exporting:
- `<Button>` — variants: default, ghost, outline, destructive, gradient (indigo→violet).
- `<Card>` — glassmorphism variant for dashboard widgets (backdrop-blur, semi-transparent bg).
- `<Badge>` — priority badges with color-coded dot indicators.
- `<Avatar>` / `<AvatarGroup>` — stacked avatars with tooltip overflow.
- `<Kbd>` — keyboard shortcut pills.
- `<Skeleton>` — shimmer loading states for every data-heavy component.
- `<CommandPalette>` — full-screen `Cmd+K` command palette with fuzzy search.
- `<Tooltip>` / `<Popover>` / `<DropdownMenu>` — consistent floating UI.
- `<Modal>` / `<Sheet>` (side drawer) — used for issue detail, settings panels.
- `<ProgressBar>` — animated, gradient fill, used on sprint and epic progress.
- `<StatusBadge>` — animated pulsing dot for active/in-progress states.

### Motion & Animation
Use **Framer Motion** throughout:
- Page transitions: fade + slide (150ms ease-out).
- Card appear: staggered fade-up on list/board load.
- Drag: spring physics on board card drag with drop shadow elevation.
- Sidebar: smooth collapse/expand with layout animation.
- Modals: scale-in from center.
- Charts: animated draw-on (lines stroke from left, bars grow from bottom).
- Skeleton → content: crossfade transition.

### Layout
- **App shell**: collapsible left sidebar (240px expanded, 56px icon-only), top header bar, main content area.
- Sidebar sections: workspace switcher (org logo + name), project list, personal (My Issues, Inbox, Drafts), admin links.
- Header: breadcrumb, global search trigger, notifications bell, user avatar menu, theme toggle.
- **Responsive**: full desktop first (1280px+), tablet-friendly (768px sidebar collapses), not mobile-native.


---

## Dashboards & Data Visualizations

### Org-Level Dashboard (`/:orgSlug`)
A beautiful overview landing page for the workspace:
- **KPI Cards** (glassmorphism style): Total Open Issues, Active Sprints, Overdue Issues, Team Members — each with a trend indicator (↑/↓ vs last week, colored green/red).
- **Throughput Chart** (area chart, Recharts): issues completed per day over the last 30 days, with a gradient fill under the line.
- **Sprint Progress** widget: mini burndown sparklines per active sprint, % complete progress bars.
- **Activity Feed**: recent org-wide events (issue created, sprint started, member joined) with relative timestamps.
- **Team Workload** heatmap: rows = members, columns = days of week, colored by issue count.

### Project Dashboard (`/:orgSlug/:projectKey`)
- **Sprint Burndown Chart** (line chart): ideal line vs actual remaining work. Animated draw-on load. Shows story points and issue count toggle.
- **Velocity Chart** (bar chart): story points completed per sprint, rolling 6-sprint average overlay.
- **Cumulative Flow Diagram** (stacked area chart): issue count per status over time — visualizes flow bottlenecks.
- **Cycle Time Distribution** (horizontal bar + scatter): time from "In Progress" to "Done" per issue type.
- **Issue Breakdown** (donut chart): issues by status, by type, by assignee — switchable.
- **Epic Progress** cards: each epic as a card with a progress bar (% of child issues done), assignee avatars, due date countdown.

### Personal Dashboard (My Issues)
- **My Assigned Issues** grouped by project, sortable by priority/due date.
- **Due This Week** timeline strip.
- **Activity** — my recent actions across all projects.

### Platform Admin Dashboard (`/admin`)
- **Tenant Overview Table**: all orgs, member count, project count, plan, created date, last active.
- **Global Metrics**: total users, total issues created (all-time + this month), active tenants chart (line, 90 days).
- **System Health** panel: Redis queue depths (BullMQ), DB connection pool utilization, recent error rate.
- **Audit Log Viewer**: searchable, filterable table of all platform-level events.


---

## Gantt / Roadmap View

The roadmap is a **first-class feature** with a fully custom Gantt chart implementation.

### Visual Design
- **Timeline header**: scrollable horizontal axis, grouped by month/week/day (zoom levels).
- **Row types**: Epics (bold, color-coded by label), Milestones (diamond marker), Sprints (subtle band overlay).
- **Bars**: rounded pill bars with gradient fills matching epic/project color. Show issue count inside bar on hover.
- **Dependencies**: arrows between linked items ("blocks" relationships), rendered as curved SVG paths.
- **Today line**: vertical red/accent dashed line marking the current date.
- **Progress fill**: darker gradient fill inside bar showing % complete.

### Interactions
- Drag bar horizontally to reschedule start/end dates (debounced PATCH to API).
- Drag right edge to extend end date.
- Click bar to open epic/milestone detail sheet.
- Zoom controls: Day / Week / Month / Quarter.
- Filter by: assignee, label, project (for cross-project org roadmap).
- Collapse/expand epic rows to show child issues inline.

### Implementation
- Build as a custom SVG + DOM hybrid component in `packages/ui/Gantt`.
- Use `@dnd-kit` for drag interactions on bars.
- Virtual rendering for rows (only render visible rows in viewport).
- Export roadmap as PNG / PDF via `html-to-image` + browser print.


---

## RBAC — Roles & Permissions

The permission model has **two layers**: Platform-level and Tenant-level.

### Platform-Level Roles (across all tenants)

| Role | Description |
|------|-------------|
| `platform_admin` | Full superadmin. Can view/edit/delete any tenant, impersonate users, access system metrics, manage billing plans. |
| `platform_support` | Read-only access to all tenants for support purposes. Cannot modify data. Can view audit logs. |

Platform roles are stored in `users.platform_role` (nullable). These users access `/admin/*` routes.

### Tenant-Level Roles (scoped per organization)

| Role | Description |
|------|-------------|
| `tenant_admin` | Full control within their org: manage members, projects, settings, billing, delete org. Equivalent to Owner. |
| `tenant_manager` | Can create/archive projects, manage sprints, assign members, view all analytics. Cannot manage billing or delete org. |
| `tenant_member` | Default role. Can create/edit/comment on issues in projects they are a member of. |
| `tenant_viewer` | Read-only. Can view issues, boards, docs but cannot create or edit anything. |
| `tenant_guest` | External collaborator. Access limited to specific projects they've been explicitly invited to. Cannot see org-wide data. |

Stored in `org_members.role` (enum).

### Project-Level Role Overrides

Within a project, a `tenant_member` can be elevated to `project_lead` (can manage sprints, statuses) or reduced to `project_viewer`. Stored in `project_members.role`.

### Permission Matrix

| Action                  | platform_admin | tenant_admin | tenant_manager | tenant_member | tenant_viewer | tenant_guest    |
| -------------------------| :--------------:| :------------:| :--------------:| :-------------:| :-------------:| :---------------:|
| View all tenants        | ✅              | ❌            | ❌              | ❌             | ❌             | ❌               |
| Delete tenant           | ✅              | ❌            | ❌              | ❌             | ❌             | ❌               |
| Manage org billing      | ✅              | ✅            | ❌              | ❌             | ❌             | ❌               |
| Manage org members      | ✅              | ✅            | ❌              | ❌             | ❌             | ❌               |
| Create/archive projects | ✅              | ✅            | ✅              | ❌             | ❌             | ❌               |
| Manage sprints          | ✅              | ✅            | ✅              | project_lead  | ❌             | ❌               |
| Create issues           | ✅              | ✅            | ✅              | ✅             | ❌             | ✅ (own project) |
| Edit/delete own issues  | ✅              | ✅            | ✅              | ✅             | ❌             | ✅               |
| Edit/delete any issue   | ✅              | ✅            | ✅              | ❌             | ❌             | ❌               |
| Comment                 | ✅              | ✅            | ✅              | ✅             | ❌             | ✅               |
| View issues             | ✅              | ✅            | ✅              | ✅             | ✅             | ✅ (own project) |
| View analytics          | ✅              | ✅            | ✅              | ✅             | ✅             | ❌               |
| View audit logs         | ✅              | ✅            | ❌              | ❌             | ❌             | ❌               |

### RBAC Implementation
- Define a `can(user, action, resource)` utility in `packages/shared/permissions.ts` using a policy object pattern.
- Middleware `requireRole(...roles)` on all API routes.
- Frontend: `usePermissions()` hook gates UI elements (hide buttons, disable inputs) — never rely solely on UI gating.
- All permission checks enforced server-side regardless of UI state.


---

## Application Security

### Authentication
- **JWT access tokens** (15 min expiry) + **refresh tokens** (7 day expiry, stored in `HttpOnly; Secure; SameSite=Strict` cookies).
- Refresh token rotation: each use issues a new refresh token and invalidates the previous (stored hashed in DB).
- Refresh token family tracking to detect token theft (invalidate entire family on reuse detection).
- **Password policy**: minimum 12 chars, bcrypt with cost factor 12.
- **Account lockout**: 5 failed login attempts → 15-minute lockout (tracked in Redis with TTL).
- **Email verification** on signup before access is granted.
- **Password reset** via time-limited (1 hour) signed tokens sent by email.
- MFA ready: TOTP scaffold with `otplib` (enforced for `platform_admin`).

### Session & Token Security
- Access token payload: `{ sub: userId, orgId, role, sessionId }` — signed with RS256 (asymmetric keys, public key for verification only on edge).
- Never store access tokens in `localStorage`; use in-memory store + refresh cookie strategy.
- Token blacklist in Redis for forced logout / account suspension.
- `sessionId` allows per-device session revocation from settings page.

### API Security
- **Helmet.js** (Fastify equivalent: `@fastify/helmet`): sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options headers.
- **CORS**: strict allowlist of tenant domains only; no wildcard.
- **Rate limiting**: global 100 req/min per IP; auth endpoints 10 req/min per IP (Redis sliding window via `@fastify/rate-limit`).
- **Input validation**: all request bodies/params validated with Zod before touching any business logic. Malformed requests return 400 immediately.
- **SQL injection prevention**: Prisma parameterized queries only; no raw string interpolation in queries.
- **Mass assignment protection**: explicit `select` / `data` fields in all Prisma calls; no spread of `req.body` into DB operations.
- **SSRF prevention**: validate and sanitize all user-supplied URLs (webhook targets, avatar URLs) against an allowlist.
- **File upload security**: validate MIME type (magic bytes, not just extension), enforce 10MB limit, scan filename for path traversal, store with randomized UUID keys in S3.
- **Secrets management**: all secrets in environment variables; never hardcoded; `.env.example` with placeholders only committed.

### Tenant Isolation (Defense in Depth)
Three layers of tenant isolation, all must pass:

1. **Application layer**: every service method accepts `orgId` from verified JWT and appends it to all DB queries.
2. **ORM layer**: a Prisma middleware that intercepts every query and asserts `where.orgId === jwt.orgId`; throws if missing.
3. **Database layer**: PostgreSQL Row-Level Security (see DB Security section).

### OWASP Top 10 Mitigations
- **Injection**: Zod validation + Prisma parameterization.
- **Broken Auth**: JWT rotation, lockout, HTTPS-only cookies.
- **Sensitive data exposure**: no PII in logs, TLS everywhere, encrypted S3.
- **XXE**: N/A (JSON API only).
- **Broken Access Control**: RBAC middleware + RLS + Prisma middleware triple-check.
- **Security misconfiguration**: Helmet headers, no default credentials, locked CORS.
- **XSS**: React escapes by default; TipTap output sanitized with DOMPurify before render.
- **Insecure deserialization**: Zod schema parse on all inbound data — no `JSON.parse` without validation.
- **Known vulnerabilities**: `npm audit` in CI; Dependabot alerts enabled.
- **Insufficient logging**: structured audit logging on all auth events and admin actions (see Logging section).


---

## Database Security & Row-Level Security (RLS)

### PostgreSQL RLS Setup

Enable RLS on every tenant-owned table. Use a `current_setting` session variable to pass the active `org_id` and `user_id` into the DB session from the application layer.

```sql
-- Set at the start of every DB transaction via Prisma middleware:
-- SET app.current_org_id = '<uuid>';
-- SET app.current_user_id = '<uuid>';
-- SET app.current_role = 'tenant_member';

-- Example: enable RLS on issues table
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues FORCE ROW LEVEL SECURITY;

-- Tenants can only see their own org's issues
CREATE POLICY issues_tenant_isolation ON issues
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- Only assignee, reporter, or org admin can update
CREATE POLICY issues_update_policy ON issues FOR UPDATE
  USING (
    org_id = current_setting('app.current_org_id')::uuid
    AND (
      assignee_id = current_setting('app.current_user_id')::uuid
      OR reporter_id = current_setting('app.current_user_id')::uuid
      OR current_setting('app.current_role') IN ('tenant_admin', 'tenant_manager')
    )
  );
```

Apply equivalent RLS policies to: `projects`, `sprints`, `epics`, `milestones`, `comments`, `docs`, `doc_pages`, `notifications`, `labels`, `org_members`, `project_members`, `attachments`.

### DB User Roles
- `app_user`: the application's DB user. Has SELECT/INSERT/UPDATE/DELETE on all tables, but NOT SUPERUSER. RLS applies.
- `app_migration`: used only during Prisma migrations. Bypasses RLS. Credentials stored separately, never in app runtime env.
- `app_readonly`: used by analytics jobs and reporting. SELECT only. RLS applies.
- Never connect as `postgres` (superuser) from the application.

### Additional DB Security
- **Connection pooling**: PgBouncer in transaction mode. Max 20 connections per tenant (configurable).
- **Encrypted columns**: store sensitive fields (API keys, webhook secrets) encrypted at rest using `pgcrypto` (`pgp_sym_encrypt`).
- **Audit trigger**: a `audit_log` table captures `OLD`/`NEW` row values, user, timestamp, and operation for sensitive tables (`users`, `org_members`, `billing`).
- **No raw SQL**: all queries through Prisma. Any necessary raw queries use `prisma.$queryRaw` with `Prisma.sql` tagged template (parameterized).
- **Backups**: daily automated pg_dump to encrypted S3 bucket with 30-day retention.
- **Schema migrations**: Prisma Migrate with explicit `up`/`down` migrations. Migrations reviewed and tested before production deploy.


---

## Logging & Observability

### Structured Logging (Pino)
Every log line is a JSON object. No `console.log` anywhere in the codebase.

```ts
// Standard log shape
{
  "level": "info",
  "time": "2026-05-25T10:30:00.000Z",
  "requestId": "req_abc123",       // injected by Fastify
  "userId": "usr_xyz",
  "orgId": "org_abc",
  "action": "issue.update",
  "resource": "issue",
  "resourceId": "iss_001",
  "durationMs": 42,
  "msg": "Issue status updated"
}
```

Log levels:
- `trace`: DB query details (dev only, never in production).
- `debug`: request lifecycle, cache hits/misses.
- `info`: all successful business operations, auth events, job completions.
- `warn`: failed auth attempts, rate limit hits, deprecated API usage.
- `error`: unhandled exceptions, DB errors, external service failures. Always include `err.stack`.
- `fatal`: startup failures, DB connection lost.

### Request Logging
- Log every inbound request: method, path, statusCode, durationMs, requestId, userId, orgId.
- Inject `X-Request-Id` header on all responses for distributed tracing.
- Redact sensitive fields automatically: `password`, `token`, `secret`, `authorization`, `cookie`.

### Audit Log
A dedicated `audit_logs` table (append-only, never deleted) records all security-relevant events:

| Field | Description |
|-------|-------------|
| `id` | UUID |
| `org_id` | Nullable (null for platform events) |
| `actor_id` | User who performed the action |
| `actor_role` | Role at time of action |
| `action` | e.g., `user.login`, `issue.delete`, `member.invite`, `sprint.complete` |
| `resource_type` | e.g., `issue`, `project`, `user` |
| `resource_id` | UUID of affected resource |
| `metadata` | JSONB — before/after values for updates |
| `ip_address` | Client IP |
| `user_agent` | Client user agent |
| `created_at` | Timestamp |

Events to audit-log:
- All auth: login, logout, login_failed, password_reset, mfa_enabled, token_refresh
- All admin actions: member invited/removed, role changed, project archived, org deleted
- Billing events: plan upgraded/downgraded
- Data deletion: issue deleted, project archived, doc deleted
- Platform admin: tenant impersonated, tenant suspended

### BullMQ Job Logging
- Log job start, completion, failure with `jobId`, `queue`, `attemptNumber`, `durationMs`.
- Failed jobs log full error with stack trace.
- BullMQ Bull Board UI at `/admin/queues` (protected, `platform_admin` only).

### Error Tracking
- Integrate **Sentry** (or self-hosted Glitchtip) for error aggregation.
- Capture unhandled exceptions and promise rejections.
- Attach user context (`userId`, `orgId`) to every Sentry event.
- Source maps uploaded on deploy for readable stack traces.

### Metrics & Health
- `GET /health` — liveness check (returns 200 if app is running).
- `GET /health/ready` — readiness check (verifies DB connection, Redis connection).
- `GET /metrics` — Prometheus-compatible metrics endpoint (protected):
  - `http_requests_total` (by method, route, status)
  - `http_request_duration_ms` (histogram)
  - `bullmq_jobs_total` (by queue, status)
  - `active_tenants_total`
  - `active_websocket_connections`


---

## Multi-Tenancy Architecture

- Each **tenant** maps to an **organization** (workspace).
- All DB tables include `org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`.
- Routing: `app.com/:orgSlug/...` (path-based). Subdomain routing (`acme.app.com`) supported via DNS + nginx config.
- Tenant onboarding: org signup → email verify → invite members → create first project (guided wizard).
- Tenant provisioning job (BullMQ): seeds default statuses, labels, and demo project on org creation.
- Tenant suspension: `organizations.suspended_at` flag. Suspended orgs get 403 on all API calls with a clear message.

---

## Core Domain Models

### Organization (Tenant)
`id`, `name`, `slug` (unique), `logo_url`, `plan` (free/pro/enterprise), `suspended_at`, `created_at`

### User
`id`, `email` (unique), `password_hash`, `full_name`, `avatar_url`, `platform_role` (nullable: platform_admin | platform_support), `mfa_secret` (encrypted), `email_verified_at`, `last_login_at`, `created_at`

### OrgMember
`org_id`, `user_id`, `role` (tenant_admin | tenant_manager | tenant_member | tenant_viewer | tenant_guest), `invited_by`, `joined_at`

### Project
`id`, `org_id`, `name`, `description`, `identifier` (e.g., `ENG`), `type` (scrum | kanban), `color` (hex), `status` (active | archived), `default_assignee_id`, `created_at`

### Issue
`id`, `org_id`, `project_id`, `issue_key` (e.g., `ENG-42`), `title`, `description` (rich text JSONB), `type` (epic | story | task | bug | subtask), `status_id` (FK → project_statuses), `priority` (urgent | high | medium | low | none), `assignee_id`, `reporter_id`, `parent_id`, `sprint_id`, `milestone_id`, `estimate` (numeric), `due_date`, `rank` (float for manual ordering), `deleted_at`, `created_at`, `updated_at`

### Sprint
`id`, `project_id`, `org_id`, `name`, `goal`, `start_date`, `end_date`, `status` (planned | active | completed), `completed_at`

### Epic
`id`, `project_id`, `org_id`, `title`, `description`, `color`, `status`, `start_date`, `end_date`, `progress` (computed)

### ProjectStatus
`id`, `project_id`, `name`, `color`, `category` (backlog | todo | in_progress | done | canceled), `position` (order)

### Comment
`id`, `issue_id`, `org_id`, `author_id`, `body` (rich text JSONB), `parent_id` (for threads), `deleted_at`, `created_at`

### AuditLog
(see Logging section above)

### Notification
`id`, `user_id`, `org_id`, `type`, `payload` (JSONB), `read_at`, `created_at`

### Label
`id`, `org_id`, `project_id` (nullable — org-scoped if null), `name`, `color`

### Attachment
`id`, `org_id`, `issue_id`, `uploader_id`, `filename`, `mime_type`, `size_bytes`, `s3_key`, `created_at`

### Doc / Wiki
`id`, `project_id`, `org_id`, `parent_id` (tree), `title`, `content` (JSONB blocks), `author_id`, `version`, `deleted_at`, `created_at`, `updated_at`

### Session
`id`, `user_id`, `refresh_token_hash`, `device_info`, `ip_address`, `last_used_at`, `expires_at`, `revoked_at`


---

## Key Features

### 1. Issue Tracker
- Create, edit, delete issues with rich-text block editor (TipTap)
- Inline editing of all fields from list/board views
- Keyboard shortcuts: `C` create, `A` assign, `P` set priority, `S` set status, `/` open command palette
- Bulk actions: reassign, change status, move to sprint, add label, delete
- Issue detail: full activity timeline, threaded comments, linked issues, attachments, time tracking
- Issue linking: "blocks", "is blocked by", "duplicates", "relates to"
- Duplicate detection warning on similar title

### 2. Board Views
- **Kanban**: drag-and-drop cards, swimlanes (assignee/epic/priority), WIP limits, collapsible columns
- **Scrum Board**: sprint-scoped, backlog panel, move to/from sprint
- Filters: assignee, label, priority, epic, due date, type
- Saved filter presets per user

### 3. Backlog
- Drag-to-reorder with persisted rank
- Bulk sprint assignment
- Epic breakdown swimlanes
- Quick-add inline

### 4. Sprint Management
- Create, start, complete sprints
- Sprint completion wizard: move incomplete issues to backlog or next sprint
- Velocity history, burndown chart

### 5. Roadmap / Gantt
(see Gantt section above)

### 6. Dashboards & Analytics
(see Dashboards section above)

### 7. Docs / Wiki
- Block editor (TipTap): headings, paragraphs, bullets, code, tables, callouts, dividers, images, file embeds
- Issue mentions (`ENG-42` renders as a linked badge)
- Page tree sidebar with drag-to-reorder
- Full-text search across all pages
- Version history with diff viewer

### 8. Real-time Collaboration
- WebSocket rooms per org+project
- Live presence indicators (who's viewing this issue)
- Instant board state updates, comment streaming
- Reconnect with exponential backoff + state reconciliation

### 9. Notifications
- In-app bell with badge count, grouped by project
- Email (BullMQ): per-event and daily digest modes
- Notification preferences per user per project
- Mark all read, mute project

### 10. Global Search (`Cmd+K`)
- Full-text across issues, docs, comments, members
- Result type icons, project badge, keyboard navigation
- Recent searches stored per user

### 11. Platform Admin Portal (`/admin`)
- Tenant management: list, view, suspend, delete orgs
- User management: list all users, change platform role, force logout
- System metrics dashboard
- Audit log viewer with filters (actor, action, date range, tenant)
- BullMQ queue monitor

### 12. Settings
- **Org**: name, slug, logo upload, plan, danger zone
- **Members**: invite, role management, remove, pending invites
- **Projects**: statuses, labels, integrations config, archive
- **Security**: active sessions viewer, revoke sessions, MFA setup
- **Notifications**: global preferences, email digest schedule
- **API Keys**: generate personal API tokens for integrations


---

## Background Jobs (BullMQ)

All queues backed by Redis. Workers run as separate Node processes (`apps/worker`).

| Queue | Job | Trigger | Retry |
|-------|-----|---------|-------|
| `notifications` | Fan-out in-app notifications to members | Any issue event | 3x, exp backoff |
| `email` | Transactional emails (invite, verify, reset, digest) | Auth events, daily cron | 5x, exp backoff |
| `analytics` | Recompute burndown, velocity, CFD | Sprint update, hourly cron | 2x |
| `search-index` | Update PostgreSQL tsvector index | Any issue/doc write | 3x |
| `webhooks` | Deliver outbound webhooks | Any subscribed event | 5x, exp backoff |
| `cleanup` | Soft-delete purge, expired token cleanup | Daily cron | 1x |
| `audit` | Write audit log entries async | Any auditable event | 5x (critical) |
| `exports` | Generate CSV/PDF exports | User request | 2x |

- Dead-letter queue: failed jobs after max retries → `dlq` queue, alerted via Slack webhook.
- BullMQ `FlowProducer` for multi-step job chains (e.g., sprint complete → analytics recompute → send digest).
- Bull Board UI at `/admin/queues` behind `platform_admin` auth.

---

## API Design

- **RESTful JSON API**, versioned: `/api/v1/...`
- Auth: `Authorization: Bearer <access_token>` on all protected routes
- Tenant context: resolved from JWT `orgId` claim only — never from request body/params
- Standard envelope:
  ```json
  { "data": {...}, "meta": { "requestId": "...", "timestamp": "..." }, "error": null }
  ```
- Error envelope:
  ```json
  { "data": null, "error": { "code": "FORBIDDEN", "message": "...", "details": [...] } }
  ```
- Cursor-based pagination for lists: `?cursor=<id>&limit=25`
- Rate limiting: 200 req/min per user (Redis), 10 req/min on auth endpoints per IP

### Key Endpoint Groups
```
POST   /auth/signup
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/sessions              (list active sessions)
DELETE /auth/sessions/:id          (revoke session)

GET    /orgs
POST   /orgs
GET    /orgs/:orgId
PATCH  /orgs/:orgId
DELETE /orgs/:orgId
GET    /orgs/:orgId/members
POST   /orgs/:orgId/invites
DELETE /orgs/:orgId/members/:userId
PATCH  /orgs/:orgId/members/:userId  (change role)

GET    /orgs/:orgId/projects
POST   /orgs/:orgId/projects
GET    /projects/:projectId
PATCH  /projects/:projectId
DELETE /projects/:projectId
GET    /projects/:projectId/board
GET    /projects/:projectId/backlog
GET    /projects/:projectId/roadmap
GET    /projects/:projectId/analytics

GET    /projects/:projectId/issues
POST   /projects/:projectId/issues
GET    /issues/:issueId
PATCH  /issues/:issueId
DELETE /issues/:issueId
POST   /issues/:issueId/comments
GET    /issues/:issueId/comments
PATCH  /issues/:issueId/rank        (reorder)

GET    /projects/:projectId/sprints
POST   /projects/:projectId/sprints
POST   /sprints/:sprintId/start
POST   /sprints/:sprintId/complete

GET    /projects/:projectId/epics
POST   /projects/:projectId/epics
PATCH  /epics/:epicId

GET    /orgs/:orgId/notifications
PATCH  /notifications/:id/read
PATCH  /notifications/read-all

GET    /search?q=&orgId=&type=&projectId=

# Platform Admin (platform_admin only)
GET    /admin/orgs
GET    /admin/orgs/:orgId
POST   /admin/orgs/:orgId/suspend
DELETE /admin/orgs/:orgId
GET    /admin/users
GET    /admin/audit-logs
GET    /admin/metrics
```


---

## Frontend Architecture

| Concern | Library |
|---------|---------|
| Routing | React Router v6 (layout routes) |
| Server state | TanStack Query v5 |
| Client state | Zustand |
| UI components | shadcn/ui + Tailwind CSS v3 |
| Animation | Framer Motion |
| Rich text | TipTap v2 (ProseMirror) |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Charts | Recharts |
| Gantt | Custom SVG component (packages/ui/Gantt) |
| Forms | React Hook Form + Zod |
| Dates | date-fns |
| WebSockets | Socket.io-client (custom hooks) |
| Keyboard shortcuts | react-hotkeys-hook |
| Virtualization | @tanstack/react-virtual |
| Notifications (toast) | Sonner |
| Tables | @tanstack/react-table |
| Icons | Lucide React |

### Route Structure
```
/                                  → redirect to last org or /login
/login
/signup
/verify-email/:token
/forgot-password
/reset-password/:token
/accept-invite/:token

/admin                             → Platform admin (platform_admin only)
/admin/orgs
/admin/users
/admin/audit-logs
/admin/queues
/admin/metrics

/:orgSlug                          → Org dashboard
/:orgSlug/projects
/:orgSlug/my-issues
/:orgSlug/inbox
/:orgSlug/settings
/:orgSlug/settings/members
/:orgSlug/settings/security
/:orgSlug/settings/notifications
/:orgSlug/settings/api-keys

/:orgSlug/:projectKey              → Project dashboard
/:orgSlug/:projectKey/board
/:orgSlug/:projectKey/backlog
/:orgSlug/:projectKey/sprints
/:orgSlug/:projectKey/roadmap
/:orgSlug/:projectKey/issues/:issueKey
/:orgSlug/:projectKey/analytics
/:orgSlug/:projectKey/docs
/:orgSlug/:projectKey/docs/:pageId
/:orgSlug/:projectKey/settings
```

### State Architecture
- **TanStack Query**: all server data. Use `queryKeys` factory pattern. Optimistic updates with `onMutate` / `onError` rollback.
- **Zustand stores**: `useUIStore` (sidebar state, theme, command palette open), `useAuthStore` (current user, token), `usePresenceStore` (WebSocket presence map).
- **WebSocket**: `useProjectSocket(projectId)` hook subscribes to room on mount, updates TanStack Query cache directly on push events.

---

## Non-Functional Requirements

- **Performance**: Board virtualized with `@tanstack/react-virtual` (handles 500+ cards). API responses < 200ms p95 for list endpoints. BullMQ workers horizontally scalable.
- **Security**: (see Application Security and DB Security sections).
- **Scalability**: Stateless API servers behind load balancer. Redis cluster for cache + BullMQ. PgBouncer connection pooling. WebSocket sticky sessions via Redis adapter.
- **Accessibility**: WCAG 2.1 AA. Keyboard-navigable board (arrow keys, Enter to open). ARIA labels on all drag targets, modals, and dynamic regions. Focus trapping in modals.
- **Observability**: Pino structured logs, Sentry errors, Prometheus metrics, Audit log table, BullMQ dashboard.
- **Testing**: Vitest unit tests for domain logic and permission utils. Supertest integration tests for all API routes (auth, RBAC, tenant isolation). Playwright E2E: login → create issue → move on board → complete sprint.
- **CI/CD**: GitHub Actions pipeline: lint → typecheck → unit tests → integration tests → build → Docker image → deploy.

---

## Implementation Order

> This section replaces all previous phased delivery notes. It defines not just *what* to build but *why* in this sequence — covering dependency chains, parallelization opportunities, risk ordering, and feature-flag gates.

---

### Dependency Rules (Must Be True Before Building)

These are hard blockers. Nothing in a row can begin until every item in its "Requires" column is done and merged.

| Feature | Requires |
|---------|----------|
| Any API route | Monorepo scaffold, Fastify app, Zod, env validation |
| Any DB query | Prisma schema + initial migration + RLS base setup |
| Any frontend page | React + Vite + Router + Zustand + TanStack Query wired |
| Auth (login/signup) | DB users table, JWT util, bcrypt, email verify queue |
| Any protected route | Auth middleware + RBAC `can()` utility |
| RLS enforcement | DB session variable middleware in Prisma + `app_user` DB role |
| BullMQ jobs | Redis connection, worker process, graceful shutdown |
| Any notification | BullMQ email queue + at least one email template |
| Issue CRUD | Auth, RBAC, projects table, RLS, org isolation middleware |
| Kanban board | Issues CRUD, project statuses, drag-and-drop lib |
| Sprint management | Issues CRUD, backlog rank column, sprint tables |
| Burndown chart | Sprint management, BullMQ analytics job, Redis cache |
| Real-time (WebSocket) | Socket.io server, Redis adapter, auth on WS handshake |
| Gantt view | Epics + milestones tables, date range on issues/sprints |
| Docs / wiki | TipTap editor, doc tables, page tree, version history table |
| Global search | tsvector triggers + GIN indexes + pg_trgm extension |
| Automations | Issues CRUD, BullMQ, trigger event system, condition evaluator |
| Custom fields | Field definition + value tables, issue detail sidebar wired |
| File attachments | S3 config, presign endpoint, attachment table, virus-scan job |
| Billing | Stripe keys, subscription table, `checkPlanLimit` middleware |
| SAML SSO | Auth complete, `saml_configs` table, `samlify` library |
| Retro board | Sprints complete, WebSocket rooms, retro tables |
| Dependency graph | Issue links table, D3/Dagre library, cycles detection util |
| PWA / push | Service worker, VAPID keys, `push_subscriptions` table |
| Report builder | Analytics BullMQ jobs running, `saved_reports` table |
| Data import | BullMQ, project + issue create services, import job processor |
| CI/CD | All unit + integration tests passing, Dockerfiles working |

---

### Dependency Graph (Mermaid)

```mermaid
graph TD
  A[Monorepo + Tooling] --> B[DB Schema + Migrations]
  A --> C[Frontend Shell + Router]
  B --> D[Auth — users, sessions, JWT]
  D --> E[RBAC + RLS]
  E --> F[Projects + Issues CRUD]
  F --> G[Kanban Board]
  F --> H[Issue Templates]
  F --> I[BullMQ Workers]
  I --> J[Notifications + Email Queue]
  G --> K[Backlog + Sprint Tables]
  K --> L[Sprint Mgmt Wizards]
  L --> M[Burndown + Velocity Charts]
  L --> N[Retrospective Board]
  F --> O[Epics + Milestones]
  O --> P[Gantt / Roadmap View]
  O --> Q[Dependency Graph]
  F --> R[Custom Fields]
  F --> S[File Attachments]
  F --> T[Time Tracking]
  F --> U[Calendar View]
  C --> V[WebSocket — Socket.io]
  V --> W[Real-time Board + Presence]
  V --> N
  F --> X[Full-text Search — tsvector]
  X --> Y[Global Search Cmd+K]
  F --> Z[Docs / Wiki — TipTap]
  Z --> AA[Inline Doc Comments]
  I --> AB[Automation Engine]
  D --> AC[OAuth — Google/GitHub]
  D --> AD[SAML SSO]
  E --> AE[Custom Roles]
  J --> AF[Email Drip Sequence]
  M --> AG[Report Builder]
  F --> AG
  D --> AH[Billing — Stripe]
  AH --> AI[Feature Flag Gates]
  S --> AJ[Push Notifications / PWA]
  A --> AK[CI/CD Pipeline]
  AK --> AL[Preview Environments]
  AK --> AM[Production Deploy]
```

---

### Risk-First Principle

The highest-risk items — those most uncertain technically or most likely to require architectural changes — are scheduled **earliest**, not saved for the end.

| Item | Risk | Why Early |
|------|------|-----------|
| RLS + Prisma middleware | High | Affects every query; retrofitting is dangerous |
| WebSocket + Redis adapter | Medium-High | Scaling model must be validated before building real-time features on top |
| Custom Gantt (SVG) | High | Complex visual + drag interaction; needs R&D time |
| Dependency graph (D3/Dagre) | Medium | Layout algorithm and cycle detection need prototyping |
| Direct-to-S3 upload flow | Medium | CORS + presign + malware scan pipeline is fiddly |
| Stripe webhooks | Medium | Idempotency + event ordering bugs only appear under load |
| SAML SSO | Medium | `samlify` + IdP config is complex; test with Okta dev account early |
| DB partitioning migration | High | Must run before tables grow large; zero-downtime swap is risky |

---

### Parallel Workstreams

Within each sprint, these workstreams are independent and can run simultaneously across developers.

**Sprint 1–2 (Foundation)**
```
Stream A (Backend)   Monorepo + Fastify + DB schema + Auth API + RBAC + RLS
Stream B (Frontend)  Vite + Router + Zustand + shadcn/ui + dark mode + app shell
Stream C (Infra)     Docker Compose + CI skeleton + seed script + env validation
```

**Sprint 3–4 (Core app)**
```
Stream A   Issues CRUD API + RLS policies + OpenAPI schemas
Stream B   Kanban board UI (can run against mock data / MSW while API is in progress)
Stream C   BullMQ workers + email templates + notification pipeline
```

**Sprint 5–6 (Agile)**
```
Stream A   Sprint API (create/start/complete) + analytics job (burndown)
Stream B   Backlog UI + sprint wizards + burndown chart component
Stream C   Org dashboard + KPI aggregation queries + heatmap
```

**Sprint 7–8 (Power)**
```
Stream A   Docs/wiki backend (TipTap JSONB storage, page tree, versions)
Stream B   Gantt component R&D (SVG + dnd-kit bars, zoom, dependency arrows)
Stream C   WebSocket rooms + Socket.io Redis adapter + presence hooks
Stream D   Search index triggers + pg_trgm + search API
```

**Sprint 9–10 (Power continued)**
```
Stream A   Automation engine (trigger system, condition evaluator, action executor)
Stream B   Custom fields (field builder UI, value storage, board card display)
Stream C   File attachment pipeline (S3 presign, virus scan, image thumbnails)
Stream D   Dependency graph (D3 prototype → integrate into issue detail + sprint board)
```

**Sprint 11–14 (Growth)**
```
Stream A   Billing (Stripe Checkout + Portal + webhooks + plan gates)
Stream B   SAML SSO + OAuth providers + JIT provisioning
Stream C   Report builder UI + export pipeline (PDF via Playwright, Excel via exceljs)
Stream D   Testing: E2E Playwright suite + k6 load tests + axe-core CI
```

**Sprint 15–20 (Enterprise + Polish)**
```
Stream A   Custom roles UI + white-labeling + custom app domain
Stream B   GDPR (deletion + export wizards) + onboarding drip
Stream C   Slack/Discord/Teams integrations + GitHub/GitLab + webhooks
Stream D   DB partitioning migration + PostHog + Sentry source maps + Grafana dashboards
Stream E   Documentation (all docs/ files) + API SDK generation + API versioning
```

---

### Feature Flag Gates

These features are built behind feature flags so incomplete work can be merged to `main` without breaking the app. Flag turned on in staging first, then production.

| Feature | Flag Key | Unlock Condition |
|---------|----------|-----------------|
| Gantt / Roadmap | `gantt_view` | Full drag + dependency arrows working |
| Automation engine | `automations` | All 10 triggers + core actions tested |
| Custom fields | `custom_fields` | Field builder + board card display done |
| SAML SSO | `saml_sso` | Tested against Okta + Azure AD |
| Custom roles | `custom_roles` | Role builder + RBAC integration tested |
| Dependency graph | `dependency_graph` | Cycle detection + critical path stable |
| Retro board | `retro_board` | Real-time voting + action item → issue flow done |
| Report builder | `report_builder` | Save + schedule + PDF export working |
| White-labeling | `white_label` | Custom domain + SSL provisioning working |
| Push notifications | `push_notifications` | Service worker + VAPID + click handler done |
| Product analytics | `product_analytics` | PostHog initialized + consent check wired |

---

### Testability Milestones

Points at which automated test suites can meaningfully run against real working flows:

| Milestone | Week | What Can Be Tested |
|-----------|------|-------------------|
| Auth complete | 2 | Unit: JWT utils, bcrypt, permission matrix. Integration: signup, login, lockout, session revoke |
| Issues CRUD complete | 3 | Integration: CRUD + RBAC on all 6 roles + RLS tenant isolation |
| Board + Sprint complete | 6 | E2E: create issue → drag to done → create sprint → add issue → start sprint |
| Real-time wired | 9 | Integration: WebSocket emit → client receives → TanStack Query cache updated |
| Gantt + Docs complete | 11 | E2E: create epic → drag on Gantt → create doc → search for it |
| Billing complete | 13 | Integration: Stripe webhook → subscription activated → plan gate enforced |
| Full suite | 16 | E2E: all 11 journeys. k6: board + search + WebSocket. axe-core: all pages |

---

## Deliverable Expectations

Generate a production-quality codebase with:

- **Monorepo** structure:
  ```
  apps/
    web/          ← React + TypeScript (Vite)
    api/          ← Fastify + TypeScript
    worker/       ← BullMQ workers
    admin/        ← Platform admin UI (can be part of web with route guards)
  packages/
    shared/       ← Zod schemas, types, permission utils (shared between api + web)
    ui/           ← Component library (shadcn base + custom components + Gantt)
    db/           ← Prisma schema, migrations, seed
    config/       ← ESLint, TypeScript, Tailwind shared configs
  ```
- **End-to-end types**: shared Zod schemas in `packages/shared` used for both API validation and frontend form/query types.
- **Prisma Migrate** for all DB migrations with RLS policy migration files.
- **Docker Compose** for local dev: `postgres`, `redis`, `api`, `worker`, `web` — all with hot reload.
- **Environment validation** at startup with Zod + dotenv — app crashes with a clear error if required env vars are missing.
- **Seed script** (`packages/db/seed.ts`): creates a platform admin user, one demo tenant, demo project with sample issues and a completed sprint.
- **README** per app and root level: setup instructions, env var reference, architecture overview, RBAC table, how to run tests.

---

## Mobile Responsiveness

The app is **desktop-first but fully mobile-responsive**. Every screen must be usable on a 375px-wide phone without horizontal scrolling or broken layouts.

### Breakpoint System (Tailwind)
```
xs:  < 480px   → phone portrait
sm:  480–767px → phone landscape / small tablet
md:  768–1023px → tablet portrait
lg:  1024–1279px → tablet landscape / small laptop
xl:  1280–1535px → desktop
2xl: ≥ 1536px  → wide desktop
```

### Layout Adaptations

**Sidebar**
- Desktop (xl+): fixed left sidebar, 240px expanded / 56px collapsed.
- Tablet (md–lg): sidebar hidden by default, opens as an overlay drawer on hamburger tap. Semi-transparent backdrop.
- Mobile (xs–sm): sidebar is a full-height bottom sheet / slide-in drawer triggered by a floating menu button. Closes on backdrop tap or swipe-left gesture.

**Header**
- Desktop: full breadcrumb + search bar + notification bell + avatar.
- Tablet: breadcrumb truncates, search collapses to icon.
- Mobile: only title + hamburger + notification icon. Search opens as a full-screen overlay.

**Kanban Board**
- Desktop: horizontal scroll of status columns, all visible.
- Tablet: 2 columns visible with horizontal snap-scroll.
- Mobile: single-column view, column selector tabs at top (tap to switch status column). Cards show title, priority badge, assignee avatar only. Drag-to-reorder within a column still works via `@dnd-kit` touch sensor.

**Issue List / Backlog**
- Desktop: full table with all columns.
- Tablet: hide estimate and sprint columns.
- Mobile: card-style rows — title, priority dot, assignee avatar, due date. Tap to open issue detail sheet.

**Issue Detail**
- Desktop: two-column layout (main content left, metadata sidebar right).
- Mobile: single column, metadata fields collapse into an expandable "Details" accordion below the description.

**Gantt / Roadmap**
- Desktop: full Gantt with timeline header and row labels.
- Tablet: reduced zoom (week view default), row labels truncated to 120px.
- Mobile: Gantt is replaced by a **List Roadmap** view — vertical list of epics/milestones with start/end date chips and a mini progress bar. A banner prompts "For the full Gantt view, use a larger screen."

**Dashboards**
- Desktop: 3–4 column grid of chart cards.
- Tablet: 2-column grid.
- Mobile: single column stacked. Charts reflow: burndown becomes a smaller aspect ratio, donut charts shrink to 200px, KPI cards stack 2×2.

**Modals & Sheets**
- Desktop: centered modal dialog (max-w-2xl).
- Mobile: all modals become **bottom sheets** that slide up from the bottom of the screen, with a drag handle and swipe-to-dismiss gesture. Use Vaul (or a custom Framer Motion bottom sheet).

**Command Palette (`Cmd+K`)**
- Desktop: centered overlay with keyboard navigation.
- Mobile: full-screen overlay, virtual keyboard-aware (adjusts position with `visualViewport` API).

**Navigation**
- Mobile: persistent **bottom navigation bar** (5 tabs: Home, Projects, My Issues, Inbox, Search) replaces the sidebar's primary nav items. Disappears on scroll down, reappears on scroll up.

**Forms & Inputs**
- All input fields min-height 44px (Apple HIG touch target).
- Date pickers use native `<input type="date">` on mobile, custom popover on desktop.
- Rich text editor (TipTap) on mobile: simplified toolbar (Bold, Italic, Link, List) shown as a floating bubble menu above selection.

**Touch Gestures**
- Swipe right on an issue card to mark as done (with undo snackbar).
- Swipe left on a notification to dismiss.
- Pull-to-refresh on issue lists and dashboards.
- Long-press on a board card to enter multi-select mode.

**Performance on Mobile**
- Lazy-load all chart components (`React.lazy` + `Suspense`).
- Reduce WebSocket event frequency on mobile (batch updates every 2s instead of immediate).
- `prefers-reduced-motion` media query: disable Framer Motion animations entirely when user has this set.
- Image attachments: serve WebP via S3 presigned URLs with responsive `srcSet`.


---

## Correlation ID / Request Tracing

Every request through the system — HTTP, WebSocket, and background job — must carry a **Correlation ID** that ties together all log entries, DB queries, and downstream calls for that logical operation.

### HTTP Requests

On the Fastify API:

```ts
// apps/api/src/plugins/correlationId.ts
import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';

export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Accept from upstream (load balancer, frontend) or generate new
    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      `req_${randomUUID()}`;

    request.correlationId = correlationId;

    // Echo back on every response
    reply.header('x-correlation-id', correlationId);
    reply.header('x-request-id', correlationId);

    // Bind to logger so every log in this request includes it
    request.log = request.log.child({ correlationId });
  });
});

// Augment Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}
```

All service layer functions accept a `ctx: RequestContext` object:
```ts
interface RequestContext {
  correlationId: string;
  userId: string;
  orgId: string;
  role: string;
  logger: Logger; // Pino child logger already bound with correlationId
}
```

Every Pino log line automatically includes `correlationId` — no manual passing needed once the child logger is bound.

### WebSocket Events

Every WebSocket message payload includes `correlationId`:
```json
{
  "event": "issue.updated",
  "correlationId": "req_abc-123",
  "payload": { ... }
}
```

Server-side Socket.io middleware extracts or generates `correlationId` on handshake and binds it to the socket instance.

### BullMQ Jobs

Every job payload includes `correlationId` from the originating request:
```ts
await notificationQueue.add('send', {
  correlationId: ctx.correlationId,   // ← carried from HTTP request
  userId,
  orgId,
  event: 'issue.assigned',
  payload: { ... }
});
```

BullMQ worker processors extract `correlationId` from job data and create a child logger:
```ts
worker.process(async (job) => {
  const log = logger.child({
    correlationId: job.data.correlationId,
    jobId: job.id,
    queue: job.queueName,
  });
  log.info('Job started');
  // ...
});
```

This means a single user action (e.g., assigning an issue) produces log entries in the API, the notification queue worker, and the email worker — all sharing the same `correlationId`, making the full trace queryable in your log aggregator.

### Database Queries

Set `correlationId` as a PostgreSQL session comment so it appears in `pg_stat_activity` and slow query logs:
```ts
// Prisma middleware
prisma.$use(async (params, next) => {
  await prisma.$executeRawUnsafe(
    `SET LOCAL application_name = '${ctx.correlationId}'`
  );
  return next(params);
});
```

### Frontend

The React app generates a `correlationId` per user action (not per HTTP request) for multi-request operations like "complete sprint":
```ts
// utils/correlationId.ts
export const generateCorrelationId = () => `client_${randomUUID()}`;

// In TanStack Query mutation
useMutation({
  mutationFn: (data) => {
    const correlationId = generateCorrelationId();
    return api.patch(`/issues/${id}`, data, {
      headers: { 'x-correlation-id': correlationId }
    });
  }
});
```

### Log Aggregation
All services log to stdout in JSON. In production, a log shipper (Fluentd / Logstash / Vector) forwards to an aggregator (OpenSearch / Loki / Datadog). Querying `correlationId = "req_abc-123"` returns the complete trace across API, worker, and DB.

### Trace Header Propagation Chain
```
Browser
  → X-Correlation-Id: client_xxx
  → API (Fastify)
    → Pino log: { correlationId: "client_xxx" }
    → Prisma query: SET LOCAL application_name = 'client_xxx'
    → BullMQ job payload: { correlationId: "client_xxx" }
      → Worker log: { correlationId: "client_xxx", jobId: "..." }
        → Email send log: { correlationId: "client_xxx" }
```


---

## Documentation Requirements

Every documentation artifact listed below must be generated as part of the deliverable. All docs live in the `docs/` folder at the monorepo root, except where noted.

```
docs/
  user/
    getting-started.md
    projects.md
    issues.md
    sprints.md
    roadmap.md
    docs-wiki.md
    notifications.md
    search.md
    settings.md
    keyboard-shortcuts.md
  developer/
    getting-started.md
    architecture.md
    monorepo.md
    environment-variables.md
    database.md
    api.md
    frontend.md
    background-jobs.md
    websockets.md
    testing.md
    contributing.md
  security/
    overview.md
    authentication.md
    rbac.md
    rls.md
    logging-audit.md
    incident-response.md
  database/
    schema.md
    migrations.md
    rls-policies.md
    performance.md
    backup-restore.md
  api/
    openapi.yaml            ← machine-readable Swagger/OpenAPI 3.1 spec
    README.md               ← how to use the API, auth, pagination
  ops/
    deployment.md
    docker.md
    monitoring.md
    runbooks.md
```

---

### 1. User Documentation (`docs/user/`)

Written for non-technical end users. Friendly tone, step-by-step with annotated screenshots (use placeholder `[SCREENSHOT: ...]` markers).

**getting-started.md**
- Creating an account and verifying email
- Creating your first organization
- Inviting team members
- Creating your first project
- Creating your first issue
- Quick tour of the UI (sidebar, header, board)

**projects.md**
- Project types: Scrum vs Kanban
- Creating and configuring a project
- Custom statuses (adding, reordering, categorizing)
- Archiving and restoring projects
- Project settings overview

**issues.md**
- Creating issues (keyboard shortcut, button, inline)
- Issue types and when to use each (Epic, Story, Task, Bug, Subtask)
- Priority levels explained
- Assigning, labeling, and setting due dates
- Rich text editor guide (all block types)
- Linking issues (blocks, relates to, duplicates)
- Attachments and file uploads
- Bulk actions

**sprints.md**
- What is a sprint and why use one
- Creating a sprint
- Moving issues to a sprint
- Starting a sprint
- The Scrum board during a sprint
- Completing a sprint (wizard walkthrough)
- Burndown chart explained

**roadmap.md**
- Epics and milestones explained
- Using the Gantt roadmap view
- Zoom levels (day / week / month / quarter)
- Dragging to reschedule
- Dependency arrows
- Exporting the roadmap

**keyboard-shortcuts.md**
- Full shortcut reference table organized by context (global, board, issue detail, editor)

---

### 2. New Developer Documentation (`docs/developer/`)

Written for engineers joining the project or contributing for the first time.

**getting-started.md**
```markdown
# New Developer Onboarding

## Prerequisites
- Node.js 20+
- Docker Desktop
- pnpm 8+
- Git

## Clone & Install
git clone <repo>
cd project-manager
pnpm install

## Environment Setup
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Fill in required values (see docs/developer/environment-variables.md)

## Start Infrastructure
docker compose up -d postgres redis

## Run Migrations & Seed
pnpm --filter @pm/db migrate
pnpm --filter @pm/db seed

## Start Development Servers
pnpm dev   # starts api, worker, and web concurrently

## Access
- Web:        http://localhost:5173
- API:        http://localhost:3000
- Bull Board: http://localhost:3000/admin/queues
- API Docs:   http://localhost:3000/docs  (Swagger UI)

## Default Seed Credentials
- Platform Admin: admin@platform.dev / Password123!
- Demo Tenant Admin: demo@acme.dev / Password123!
```

**architecture.md**
- System architecture diagram (ASCII or Mermaid)
- Data flow: HTTP request → API → Prisma → PostgreSQL
- Data flow: Issue event → BullMQ → Worker → Email/Notification
- Data flow: WebSocket → Socket.io → Redis adapter → all connected clients
- How multi-tenancy works end-to-end (JWT → RLS → response)
- Monorepo package dependency graph

**environment-variables.md**
- Full reference table for every env var in every app:

| Variable | App | Required | Description | Example |
|----------|-----|----------|-------------|---------|
| `DATABASE_URL` | api, db | ✅ | Postgres connection string | `postgresql://app_user:pass@localhost:5432/pm_db` |
| `REDIS_URL` | api, worker | ✅ | Redis connection string | `redis://localhost:6379` |
| `JWT_PRIVATE_KEY` | api | ✅ | RS256 private key (base64) | `LS0t...` |
| `JWT_PUBLIC_KEY` | api | ✅ | RS256 public key (base64) | `LS0t...` |
| `JWT_ACCESS_EXPIRY` | api | ✅ | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | api | ✅ | Refresh token TTL | `7d` |
| `S3_BUCKET` | api | ✅ | S3 bucket name | `pm-attachments` |
| `S3_REGION` | api | ✅ | AWS region | `us-east-1` |
| `S3_ACCESS_KEY_ID` | api | ✅ | AWS access key | `AKIA...` |
| `S3_SECRET_ACCESS_KEY` | api | ✅ | AWS secret key | `...` |
| `SMTP_HOST` | worker | ✅ | Email server | `smtp.sendgrid.net` |
| `SMTP_PORT` | worker | ✅ | Email port | `587` |
| `SMTP_USER` | worker | ✅ | Email user | `apikey` |
| `SMTP_PASS` | worker | ✅ | Email password/key | `SG....` |
| `SENTRY_DSN` | api, worker, web | ❌ | Sentry error tracking | `https://...` |
| `VITE_API_URL` | web | ✅ | API base URL for browser | `http://localhost:3000` |
| `VITE_WS_URL` | web | ✅ | WebSocket URL | `ws://localhost:3000` |
| `APP_URL` | api | ✅ | Public app URL (for email links) | `https://app.example.com` |
| `CORS_ORIGINS` | api | ✅ | Comma-separated allowed origins | `https://app.example.com` |

**database.md**
- How to run migrations (`pnpm --filter @pm/db migrate`)
- How to create a new migration
- How to reset the database in dev
- Prisma client generation
- Seed data overview
- RLS setup and how it's applied

**contributing.md**
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/`
- Commit message format: Conventional Commits
- PR process: draft → review → squash merge
- Code style: ESLint + Prettier config
- How to add a new API endpoint (step-by-step)
- How to add a new BullMQ job
- How to add a new UI component to `packages/ui`


---

### 3. API Documentation (Swagger / OpenAPI)

**Auto-generated Swagger UI** served at `/docs` in development (and optionally at `/api/docs` behind auth in production).

Use `@fastify/swagger` + `@fastify/swagger-ui` to generate the spec from route schemas.

Every route must have:
- `operationId` (camelCase, unique)
- `summary` (one line)
- `description` (full markdown explanation)
- `tags` (e.g., `["Issues"]`)
- `security` (`[{ bearerAuth: [] }]` on protected routes)
- Full `requestBody` schema (Zod → JSON Schema via `zod-to-json-schema`)
- Full `response` schemas for 200, 400, 401, 403, 404, 422, 429, 500
- `x-correlation-id` header documented on all requests/responses

**OpenAPI spec file** (`docs/api/openapi.yaml`) must be committed and kept in sync. Generate it via:
```bash
pnpm --filter @pm/api generate:openapi
# outputs docs/api/openapi.yaml
```

**API README** (`docs/api/README.md`) covers:
- Base URL, versioning strategy
- Authentication: how to obtain tokens, refresh flow, token expiry
- Pagination: cursor-based, `cursor` + `limit` params, `meta.nextCursor` in response
- Rate limiting: limits per role, headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`)
- Correlation ID: how to set `X-Correlation-Id`, how to read it from responses
- Error codes reference table:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Request body/params failed Zod validation |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `TOKEN_EXPIRED` | 401 | Access token expired, use refresh endpoint |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist or not visible to tenant |
| `CONFLICT` | 409 | Duplicate resource (e.g., org slug already taken) |
| `RATE_LIMITED` | 429 | Too many requests, see `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Unexpected server error, include `correlationId` in bug report |

- Webhook payload examples
- Code examples (curl, TypeScript fetch, Python requests) for the 5 most common operations

---

### 4. Security Documentation (`docs/security/`)

**overview.md**
- Security model summary: defense-in-depth, three isolation layers
- Responsible disclosure / bug bounty contact
- Security update cadence

**authentication.md**
- JWT RS256 token flow diagram (Mermaid sequence diagram)
- Access token structure (claims, expiry)
- Refresh token rotation with family invalidation diagram
- Account lockout policy
- Password requirements
- Session management (list devices, revoke)
- MFA setup guide (TOTP)
- How to force-logout all sessions

**rbac.md**
- Full role hierarchy diagram
- Platform roles vs tenant roles vs project roles
- Permission matrix (copy from RBAC section)
- How to check permissions in code (`can()` utility usage)
- How to add a new permission
- Common permission scenarios (Q&A format)

**rls.md**
- What RLS is and why it's used (defense-in-depth layer)
- How session variables are set (`app.current_org_id`, etc.)
- All RLS policies listed per table with plain-English explanation
- How to test RLS policies in psql
- How to add RLS to a new table (checklist)

**logging-audit.md**
- What is logged and what is not (PII redaction policy)
- Audit log event catalog (full list of all auditable actions)
- How to query audit logs (SQL examples + UI guide)
- Log retention policy
- How to export audit logs (CSV from admin UI)

**incident-response.md**
- Incident severity levels (P0–P3)
- P0 response playbook (data breach, auth bypass)
- How to suspend a tenant immediately
- How to revoke all sessions platform-wide
- How to rotate JWT signing keys with zero downtime
- Contact escalation chain

---

### 5. Database Documentation (`docs/database/`)

**schema.md**
- Full entity-relationship diagram (Mermaid ERD)
- Table-by-table reference:
  - Purpose
  - All columns with type, nullable, default, description
  - Indexes
  - Foreign key relationships
  - RLS policy summary

**migrations.md**
- Migration workflow (create → test locally → review → apply to staging → production)
- Naming convention for migration files
- How to write a safe zero-downtime migration (add column before removing old one, backfill pattern)
- Rollback strategy
- Migration history table explanation

**rls-policies.md**
- Complete SQL for all RLS policies with comments
- How to verify policies are working (test scripts)
- Performance implications of RLS and mitigations (partial indexes)

**performance.md**
- Index catalog: every GIN, B-tree, and partial index with rationale
- Query optimization patterns used (pagination with keyset, avoiding N+1 with Prisma `include`)
- Connection pooling setup (PgBouncer config values)
- Slow query log setup and how to read it
- `EXPLAIN ANALYZE` guide for common queries

**backup-restore.md**
- Backup schedule and retention policy
- How automated backups work (pg_dump to S3)
- Point-in-time recovery procedure
- How to restore to a local environment for debugging
- Testing backup integrity (monthly restore drill)

---

### 6. Operations Documentation (`docs/ops/`)

**deployment.md**
- Production environment overview (recommended: ECS / Railway / Render / Fly.io)
- Required infrastructure: Postgres (RDS or Supabase), Redis (ElastiCache or Upstash), S3, SMTP
- Environment variable setup in production
- Zero-downtime deploy strategy (rolling update, DB migrations before app deploy)
- Health check endpoints used by load balancer

**docker.md**
- `docker-compose.yml` service reference (all services, ports, volumes, env vars)
- How to build production Docker images
- Multi-stage Dockerfile explanation (builder → runner)
- How to run the full stack locally vs CI

**monitoring.md**
- Prometheus metrics catalog
- Recommended Grafana dashboard layout (system health, per-tenant throughput, BullMQ queue depths)
- Alert rules (suggested thresholds):
  - API error rate > 1% for 5 min → P2
  - BullMQ DLQ job count > 0 → P2
  - DB connection pool saturation > 80% → P1
  - Refresh token reuse detected → P0 (immediate)
- Sentry project setup and alert routing
- Log aggregation pipeline (stdout → Fluentd/Vector → OpenSearch/Loki)

**runbooks.md**
- "How do I restart the worker without losing jobs?" (graceful shutdown)
- "How do I drain and pause a BullMQ queue?"
- "A tenant is hitting rate limits — how do I temporarily increase their limit?"
- "How do I promote a user to platform_admin?"
- "How do I rollback a bad migration?"
- "The Redis cache is full — what do I do?"
- "How do I rotate the S3 credentials without downtime?"


---

## Issue Templates

Each project can define reusable **issue templates** that pre-fill fields when a user creates a new issue.

### Data Model
```
issue_templates
  id             UUID PK
  project_id     UUID FK → projects
  org_id         UUID FK → organizations
  name           TEXT        (e.g., "Bug Report", "Feature Request")
  description    TEXT        (shown to user when selecting)
  icon           TEXT        (emoji or Lucide icon name)
  default_type   issue_type  (bug | story | task | etc.)
  default_priority priority
  default_labels UUID[]
  default_assignee_id UUID nullable
  title_template TEXT        (e.g., "[BUG] ")
  body_template  JSONB       (TipTap block content with placeholder tokens)
  checklist      JSONB[]     (pre-populated subtask names)
  created_by     UUID FK → users
  created_at     TIMESTAMPTZ
```

### Built-in Templates (seeded per project)
- **🐛 Bug Report** — steps to reproduce, expected vs actual behavior, environment info, severity field
- **✨ Feature Request** — user story format ("As a … I want … so that …"), acceptance criteria checklist
- **🔥 Incident** — timeline, impact, root cause, resolution steps
- **📋 Task** — blank with title + description only
- **🧪 Test Case** — preconditions, test steps, expected result

### UI
- Issue creation modal: "Choose a template" step before the editor, shown as a visual card grid
- Template cards: icon, name, description, estimated fields pre-filled
- "Blank issue" option always available
- Templates manageable in **Project Settings → Templates** (create, edit, delete, reorder)
- Template body supports `{{assignee_name}}`, `{{today}}`, `{{project_name}}` tokens replaced on creation

### API
```
GET    /projects/:projectId/templates
POST   /projects/:projectId/templates
GET    /templates/:templateId
PATCH  /templates/:templateId
DELETE /templates/:templateId
POST   /projects/:projectId/issues?templateId=   (applies template defaults)
```


---

## Automation / Workflow Rules

A no-code automation engine that lets users define **trigger → condition → action** rules per project. Inspired by Jira Automation and Linear's workflow.

### Data Model
```
automation_rules
  id             UUID PK
  project_id     UUID FK
  org_id         UUID FK
  name           TEXT
  enabled        BOOLEAN DEFAULT true
  trigger_type   TEXT     (see triggers below)
  trigger_config JSONB    (event-specific config)
  conditions     JSONB[]  (AND-ed condition objects)
  actions        JSONB[]  (ordered action objects)
  run_count      INTEGER DEFAULT 0
  last_run_at    TIMESTAMPTZ
  created_by     UUID FK → users
  created_at     TIMESTAMPTZ

automation_run_logs
  id             UUID PK
  rule_id        UUID FK
  issue_id       UUID FK nullable
  triggered_by   TEXT     (user_id or 'system')
  status         TEXT     (success | failed | skipped)
  actions_taken  JSONB[]
  error          TEXT nullable
  duration_ms    INTEGER
  created_at     TIMESTAMPTZ
```

### Triggers
| Trigger | Config |
|---------|--------|
| `issue.created` | — |
| `issue.status_changed` | `from_status`, `to_status` |
| `issue.priority_changed` | `from_priority`, `to_priority` |
| `issue.assigned` | `assignee_id` |
| `issue.unassigned` | — |
| `issue.due_date_approaching` | `days_before` |
| `issue.overdue` | — |
| `sprint.started` | — |
| `sprint.completed` | — |
| `comment.added` | — |
| `schedule.cron` | `cron_expression` |

### Conditions
- `issue.type == 'bug'`
- `issue.priority in ['urgent', 'high']`
- `issue.label includes 'backend'`
- `issue.assignee == null`
- `issue.estimate > 5`
- `current_time between 09:00 and 17:00`

### Actions
| Action | Config |
|--------|--------|
| Set status | `status_id` |
| Set priority | `priority` |
| Assign to | `user_id` or `reporter` or `project_lead` |
| Add label | `label_id` |
| Remove label | `label_id` |
| Post comment | `body` (supports `{{issue_key}}`, `{{assignee}}` tokens) |
| Create subtask | `title`, `type`, `assignee_id` |
| Send notification | `user_ids[]`, `message` |
| Move to sprint | `sprint_id` or `active_sprint` |
| Set due date | `offset_days` from trigger date |
| Trigger webhook | `webhook_url`, `payload_template` |

### Execution
- Automations execute as BullMQ jobs in the `automations` queue (new queue).
- Dry-run mode: test a rule against an existing issue without applying changes.
- Per-rule run log visible in Project Settings → Automations → History.
- Max 50 rules per project (pro plan), 10 (free plan).
- Circuit breaker: rule disabled after 10 consecutive failures.

### UI
- Visual rule builder in **Project Settings → Automations**
- Step-by-step wizard: Trigger → Conditions (optional) → Actions
- Rule list with enable/disable toggle, run count, last triggered
- Run history drawer per rule with expandable log entries

### API
```
GET    /projects/:projectId/automations
POST   /projects/:projectId/automations
GET    /automations/:ruleId
PATCH  /automations/:ruleId
DELETE /automations/:ruleId
POST   /automations/:ruleId/test    (dry run)
GET    /automations/:ruleId/logs
```


---

## Calendar View

A calendar view for issues grouped by due date and sprint boundaries, surfacing deadlines at a glance.

### Views
- **Month**: grid of days. Each day shows issue chips (title truncated, priority color-coded dot). Overdue issues shown in rose red.
- **Week**: 7-column view with time slots. Issues shown as pills spanning their due date.
- **Sprint overlay**: sprint start/end date range shaded as a band across the calendar.

### Features
- Click a day to create an issue with that due date pre-filled.
- Drag an issue chip to a different day to update `due_date` (debounced PATCH).
- Filter by assignee, label, type, priority.
- Mini-calendar navigator in the sidebar for quick date jump.
- Issues without due dates shown in a "Unscheduled" sidebar panel.
- Color-coded by issue type or project (user toggle).

### Route
```
/:orgSlug/:projectKey/calendar
/:orgSlug/calendar              (cross-project org calendar)
```

### Implementation
- No third-party calendar library — build with CSS Grid for the month view, Flexbox for week view.
- Use `date-fns` for all date arithmetic.
- Virtualize: only render ±3 months from current view.

---

## Time Tracking

Per-issue time logging with estimates vs actuals and sprint-level time reports.

### Data Model
```
time_logs
  id           UUID PK
  issue_id     UUID FK
  org_id       UUID FK
  user_id      UUID FK
  logged_at    DATE          (the date work was done)
  duration_min INTEGER       (minutes logged)
  description  TEXT nullable
  created_at   TIMESTAMPTZ

-- issues table additions:
  estimate_min  INTEGER nullable  (original estimate in minutes)
  time_spent_min INTEGER GENERATED (sum of time_logs, computed column or trigger)
  time_remaining_min INTEGER nullable (manually set or auto = estimate - spent)
```

### UI
- Issue detail sidebar: **Time Tracking** widget
  - Progress bar: spent / estimate (overrun shown in red)
  - "+ Log time" button opens a popover: duration input (supports `1h 30m` format), date, optional description
  - Recent logs list with edit/delete per entry
- Sprint analytics: **Time Report** tab
  - Table: member × issue, hours logged, hours estimated
  - Bar chart: time logged per day in sprint
- Board card: shows time remaining as a small badge if logged

### API
```
GET    /issues/:issueId/time-logs
POST   /issues/:issueId/time-logs
PATCH  /time-logs/:logId
DELETE /time-logs/:logId
GET    /projects/:projectId/time-report?sprintId=
```

### BullMQ
- Daily cron job recomputes `time_spent_min` on all active-sprint issues and caches the sprint time report.


---

## In-App Changelog / "What's New"

A product changelog widget that surfaces new features and improvements to users directly inside the app.

### Data Model
```
changelog_entries
  id           UUID PK
  title        TEXT
  body         JSONB       (TipTap blocks — same editor as docs)
  category     TEXT        (feature | improvement | bugfix | announcement)
  published_at TIMESTAMPTZ nullable  (null = draft)
  created_by   UUID FK → users (platform_admin only)
  created_at   TIMESTAMPTZ

changelog_reads
  user_id      UUID FK
  entry_id     UUID FK
  read_at      TIMESTAMPTZ
  PRIMARY KEY (user_id, entry_id)
```

### UI
- **"What's New" button** in the top header (sparkle ✨ icon) with an unread badge count.
- Opens a side drawer listing entries in reverse-chronological order.
- Each entry: category badge (color-coded), title, date, body (rendered blocks).
- Entries marked as read when the user scrolls past them (Intersection Observer).
- Unread count resets to 0 after opening the drawer.

### Admin
- Platform admins write and publish entries from `/admin/changelog`.
- Draft entries visible to platform admins only.
- Published entries broadcast to all users (BullMQ job updates unread counts in Redis).

---

## Inline Doc Comments

Users can leave inline comments on specific blocks within a doc page — similar to Notion and Google Docs.

### Data Model
```
doc_comments
  id           UUID PK
  doc_id       UUID FK
  org_id       UUID FK
  author_id    UUID FK → users
  block_id     TEXT        (TipTap node id of the commented block)
  quote        TEXT        (snapshot of the text at time of comment)
  body         TEXT        (plain text comment)
  resolved     BOOLEAN DEFAULT false
  resolved_by  UUID FK nullable
  resolved_at  TIMESTAMPTZ nullable
  parent_id    UUID FK nullable  (for reply threads)
  created_at   TIMESTAMPTZ
```

### UI
- Hovering a doc block shows a comment bubble icon in the margin.
- Click to open a comment popover anchored to that block.
- Comments panel toggle on the right side of the doc editor showing all open threads.
- Resolved comments hidden by default, "Show resolved" toggle to reveal them.
- `@mention` support in comment body triggers notifications.
- Real-time: new comments appear instantly via WebSocket room for the doc.

### API
```
GET    /docs/:docId/comments
POST   /docs/:docId/comments
PATCH  /doc-comments/:commentId          (edit body or resolve)
DELETE /doc-comments/:commentId
```


---

## Billing & Subscription

Full Stripe integration for per-tenant subscription management.

### Plans

| Feature | Free | Pro ($12/user/mo) | Enterprise (custom) |
|---------|:----:|:------------------:|:-------------------:|
| Members | Up to 5 | Unlimited | Unlimited |
| Projects | 3 | Unlimited | Unlimited |
| Storage | 1 GB | 50 GB | Custom |
| Automation rules | 10 | Unlimited | Unlimited |
| API calls/month | 10,000 | 500,000 | Custom |
| Audit log retention | 30 days | 1 year | Custom |
| Priority support | ❌ | ❌ | ✅ |
| SSO (SAML) | ❌ | ❌ | ✅ |
| Custom domain | ❌ | ✅ | ✅ |
| Advanced analytics | ❌ | ✅ | ✅ |

### Data Model
```
subscriptions
  id                  UUID PK
  org_id              UUID FK UNIQUE
  stripe_customer_id  TEXT UNIQUE
  stripe_subscription_id TEXT UNIQUE nullable
  plan                TEXT     (free | pro | enterprise)
  status              TEXT     (active | trialing | past_due | canceled | paused)
  trial_ends_at       TIMESTAMPTZ nullable
  current_period_start TIMESTAMPTZ
  current_period_end  TIMESTAMPTZ
  cancel_at_period_end BOOLEAN DEFAULT false
  quantity            INTEGER   (seat count for pro)
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ

invoices
  id                UUID PK
  org_id            UUID FK
  stripe_invoice_id TEXT UNIQUE
  amount_cents      INTEGER
  currency          TEXT DEFAULT 'usd'
  status            TEXT (draft | open | paid | void | uncollectible)
  invoice_pdf_url   TEXT nullable
  period_start      TIMESTAMPTZ
  period_end        TIMESTAMPTZ
  created_at        TIMESTAMPTZ
```

### Stripe Integration
- **Checkout**: `POST /billing/checkout` creates a Stripe Checkout Session. Redirects to Stripe-hosted payment page.
- **Customer Portal**: `POST /billing/portal` creates a Stripe Customer Portal session for self-serve plan changes, payment method updates, and invoice history.
- **Webhooks**: `POST /billing/webhooks` (Stripe signature verified) handles:
  - `checkout.session.completed` → activate subscription
  - `invoice.payment_succeeded` → mark paid, update `current_period_end`
  - `invoice.payment_failed` → send dunning email, flag org `past_due`
  - `customer.subscription.updated` → sync plan/status
  - `customer.subscription.deleted` → downgrade to free
- **Trial**: 14-day free trial on Pro signup. `trial_ends_at` set. Banner shown in app during trial with days remaining. Auto-downgrade to Free on expiry.
- **Seat billing**: quantity = active `org_members` count. Synced to Stripe on member add/remove.
- **Proration**: handled by Stripe automatically on upgrade/downgrade.

### Feature Gates
A `checkPlanLimit(orgId, feature)` middleware enforces limits before creating resources:
```ts
// packages/shared/planLimits.ts
export const PLAN_LIMITS = {
  free:       { members: 5, projects: 3, storageBytes: 1_073_741_824, automationRules: 10 },
  pro:        { members: Infinity, projects: Infinity, storageBytes: 53_687_091_200, automationRules: Infinity },
  enterprise: { members: Infinity, projects: Infinity, storageBytes: Infinity, automationRules: Infinity },
};
```
- API returns `{ code: "PLAN_LIMIT_REACHED", upgrade_url: "/settings/billing" }` with 402 status when limit hit.
- Frontend shows an upgrade prompt modal when a 402 is received.

### UI
- **Org Settings → Billing**: current plan badge, usage meters (members, projects, storage), next billing date, "Upgrade" / "Manage Subscription" / "View Invoices" buttons.
- **Upgrade modal**: plan comparison table, seat count selector, total price preview, CTA to Stripe Checkout.
- **Trial banner**: dismissible top-of-page banner showing days remaining, upgrade CTA.
- **Past-due banner**: urgent red banner blocking new project creation until payment resolved.

### API
```
GET    /billing                      (current plan, usage)
POST   /billing/checkout             (create Stripe Checkout session)
POST   /billing/portal               (create Stripe Portal session)
GET    /billing/invoices             (invoice history)
POST   /billing/webhooks             (Stripe webhook endpoint)
```


---

## Feature Flags

A lightweight feature flag system to gate features per plan, per tenant, or for gradual rollouts — without redeploying.

### Data Model
```
feature_flags
  id           UUID PK
  key          TEXT UNIQUE    (e.g., 'gantt_view', 'automations', 'ai_assist')
  description  TEXT
  enabled      BOOLEAN DEFAULT false   (global default)
  created_at   TIMESTAMPTZ

feature_flag_overrides
  flag_id      UUID FK
  target_type  TEXT    (org | user | plan)
  target_id    TEXT    (org_id | user_id | 'pro')
  enabled      BOOLEAN
  created_at   TIMESTAMPTZ
  PRIMARY KEY (flag_id, target_type, target_id)
```

### Resolution Logic
```ts
// Precedence: user override > org override > plan override > global default
async function isEnabled(flagKey: string, ctx: { userId, orgId, plan }): Promise<boolean>
```

### Caching
- Flags cached in Redis per org with 60s TTL. Invalidated on any override change.
- On cache miss, load from DB and repopulate.

### API (platform_admin only)
```
GET    /admin/flags
POST   /admin/flags
PATCH  /admin/flags/:flagId
POST   /admin/flags/:flagId/overrides
DELETE /admin/flags/:flagId/overrides/:overrideId
```

### Frontend
- `useFeatureFlag('gantt_view')` hook (fetches from `/api/v1/flags/resolved` on app boot, cached in Zustand).
- Components wrapped in `<FeatureGate flag="automations"><AutomationsPage /></FeatureGate>` — renders a "Coming soon" or upgrade prompt if disabled.

---

## Developer Experience (DX) Tooling

### Monorepo Build Orchestration — Turborepo
Use **Turborepo** to manage the monorepo build pipeline.

```json
// turbo.json
{
  "pipeline": {
    "build":   { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev":     { "cache": false, "persistent": true },
    "lint":    { "outputs": [] },
    "typecheck": { "dependsOn": ["^build"], "outputs": [] },
    "test":    { "dependsOn": ["^build"], "outputs": ["coverage/**"] }
  }
}
```

Root `package.json` scripts:
```json
{
  "dev":       "turbo run dev",
  "build":     "turbo run build",
  "lint":      "turbo run lint",
  "typecheck": "turbo run typecheck",
  "test":      "turbo run test"
}
```

### Git Hooks — Husky + lint-staged + commitlint

```bash
pnpm add -Dw husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

`.husky/pre-commit`:
```sh
pnpm lint-staged
```

`.husky/commit-msg`:
```sh
npx --no -- commitlint --edit $1
```

`lint-staged.config.js`:
```js
export default {
  '**/*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '**/*.{json,md,yaml}': ['prettier --write'],
};
```

`commitlint.config.js`:
```js
export default { extends: ['@commitlint/config-conventional'] };
// Enforces: feat(scope): message | fix: | chore: | docs: | refactor: | test:
```

### Shared Configs in `packages/config`
```
packages/config/
  eslint-preset.js      ← shared ESLint config (extends airbnb-ts + custom rules)
  prettier.config.js    ← shared Prettier config
  tsconfig.base.json    ← shared TypeScript config (strict, paths, etc.)
  tailwind.config.base.js ← shared Tailwind theme tokens
```

Every app extends these:
```json
// apps/web/tsconfig.json
{ "extends": "@pm/config/tsconfig.base.json", "include": ["src"] }
```

### Graceful Shutdown

**API (Fastify)**:
```ts
const shutdown = async (signal: string) => {
  fastify.log.info({ signal }, 'Shutting down...');
  await fastify.close();           // stops accepting new connections, waits for in-flight requests
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
```

**Worker (BullMQ)**:
```ts
const shutdown = async () => {
  await worker.close();            // waits for active job to complete (up to closeTimeout)
  await redis.quit();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
// Use closeTimeout: 30_000 so in-flight jobs get 30s to complete before force-kill
```

### Preview & Staging Environments
- **Per-PR preview deploys**: configure via Railway / Render / Fly.io preview environments. Each PR gets a unique URL (`https://pm-pr-123.up.railway.app`).
- **Staging environment**: permanent staging env pointing to `main` branch. Shares nothing with production (separate DB, Redis, S3 bucket).
- CI workflow:
  1. `push` to feature branch → lint + typecheck + unit tests + integration tests
  2. PR opened → deploy preview environment, run E2E tests against it
  3. Merge to `main` → deploy to staging, run smoke tests
  4. Manual trigger → deploy to production (with migration step)


---

## GDPR & Data Privacy

### User Rights Implementation

**Right to Erasure ("Delete My Account")**
- Route: `DELETE /users/me` (requires password confirmation)
- Process (BullMQ `gdpr` queue):
  1. Anonymize user record: replace `email`, `full_name`, `avatar_url` with anonymized placeholders (`deleted-user-<hash>@deleted.invalid`). Preserve `id` as FK anchor.
  2. Revoke all active sessions.
  3. Remove from all org memberships.
  4. Soft-delete all issues, comments, and docs authored by the user.
  5. Delete all personal notifications.
  6. Purge S3 avatar.
  7. Write `user.deleted` audit log entry (kept for compliance).
  8. Send confirmation email.
- Org deletion (`DELETE /orgs/:orgId`): cascades to delete all tenant data (issues, projects, docs, members, files from S3). BullMQ job handles S3 purge asynchronously.

**Right to Data Portability**
- Route: `POST /users/me/export` — queues a BullMQ `exports` job.
- Export package (ZIP): `profile.json`, `issues.json`, `comments.json`, `docs.json`, `time-logs.json`, `notifications.json`.
- Download link emailed when ready (presigned S3 URL, 24h expiry).
- Org-level export for `tenant_admin`: `POST /orgs/:orgId/export` — exports all org data.

**Cookie Consent**
- On first visit, show a **cookie consent banner** (bottom of screen).
- Categories: Strictly Necessary (always on), Analytics (opt-in), Marketing (opt-in, if applicable).
- Consent stored in `localStorage` + a `cookie_consent` DB field on `users` (once authenticated).
- No analytics scripts load until consent is granted.

**Data Retention**
- Audit logs: retained 1 year (free), indefinitely (pro/enterprise). `cleanup` BullMQ job purges old entries.
- Soft-deleted records: purged after 30 days by the `cleanup` job.
- Session tokens: purged on `expires_at`.
- Exported archives: S3 lifecycle policy deletes export ZIPs after 7 days.

**Privacy & Legal Pages**
- Routes: `/privacy`, `/terms`, `/dpa` — static React pages.
- DPA (Data Processing Agreement) page for enterprise tenants with a "Sign DPA" CTA (DocuSign stub or checkbox + email confirmation).

**Privacy Settings UI**
- **Settings → Privacy**: download your data, delete account, connected sessions, cookie preferences.

---

## Secret Rotation

### JWT Signing Key Rotation (Zero Downtime)
1. Generate a new RS256 key pair.
2. Add new public key to a `jwks.json` endpoint (`GET /auth/.well-known/jwks.json`) alongside the old one.
3. API verifies tokens against all keys in JWKS (key ID `kid` claim used for lookup).
4. Set `JWT_PRIVATE_KEY` to the new key — new tokens issued with new key.
5. Wait for all old tokens to expire (max 15 min access token TTL).
6. Remove old public key from JWKS.

Document this procedure in `docs/security/incident-response.md`.

### DB Password Rotation
1. Create new DB user with same grants in PostgreSQL.
2. Update `DATABASE_URL` in secrets manager (AWS Secrets Manager / Doppler).
3. Rolling restart of API pods — each picks up new `DATABASE_URL`.
4. Drop old DB user.

### S3 / SMTP Credential Rotation
Same pattern: provision new credentials → update secrets manager → rolling restart → revoke old credentials. Document as a runbook entry.

### Dependabot / Automated Dependency Scanning
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule: { interval: weekly }
    groups:
      production-deps: { dependency-type: production }
      dev-deps:        { dependency-type: development }
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]  # major updates manual only
```

- Snyk (or GitHub Advanced Security) integrated in CI: `snyk test --severity-threshold=high` fails the build on high/critical CVEs.
- `npm audit --audit-level=high` run on every CI pipeline.


---

## Empty States & Onboarding

### Empty State Components
Every data-less view must show a **beautiful, illustrated empty state** — not a blank screen or a generic "No data" message.

Each empty state includes:
- An SVG illustration (custom, matching the app's color palette — dark/light mode variants)
- A concise headline ("No issues yet")
- A supporting sentence ("Create your first issue to start tracking work.")
- A primary CTA button
- Optional keyboard shortcut hint ("Press C to create an issue")

| Screen | Illustration Theme | CTA |
|--------|-------------------|-----|
| Empty board | Board with floating cards | "Create Issue" |
| Empty backlog | Empty inbox tray | "Add to backlog" |
| Empty sprints | Calendar with a rocket | "Create Sprint" |
| Empty roadmap | Telescope on horizon | "Create Epic" |
| Empty docs | Open blank notebook | "Create a page" |
| Empty notifications | Bell with zZZ | "You're all caught up" (no CTA) |
| Empty search results | Magnifying glass + question mark | "Try different keywords" |
| Empty members | Group of outlines | "Invite teammates" |
| Empty projects | Folder with sparkle | "Create Project" |
| 0 automations | Cogs with zzz | "Create Automation" |

### Onboarding Wizard
A guided checklist shown to new org admins on first login, anchored as a floating card (bottom-right) until all steps are complete.

```
□ Verify your email
□ Invite a team member
□ Create your first project
□ Create your first issue
□ Start your first sprint
□ Explore the roadmap
```

- Each step: icon, title, description, "Do it now →" link to the relevant page.
- Progress bar: "3 of 6 steps complete".
- Dismiss button (with confirmation: "Are you sure? You can re-open this from Settings.").
- Completion: confetti animation + "You're all set" message.
- State stored in `org_onboarding` table (`step_key`, `completed_at`), so it survives page refreshes.

### Product Tour
On first visit to key pages, a **spotlight tour** highlights UI elements:

- **Board tour** (first time on board): highlights status columns, the "+ New Issue" button, the filter bar, and drag-to-reorder.
- **Roadmap tour** (first time on roadmap): highlights zoom controls, the today line, and drag-to-reschedule.

Implementation: `driver.js` library. Tour configs stored as JSON in `packages/ui/tours/`. Tours shown once per user per feature (tracked in `user_preferences.tours_seen JSONB`).

---

## Error Pages & Error Boundaries

### Designed Error Pages
Full-page error views with on-brand illustrations, accessible from any route:

| Route | Code | Headline | Illustration |
|-------|------|----------|-------------|
| `/404` | 404 | "Page not found" | Astronaut floating in space |
| `/403` | 403 | "Access denied" | Door with lock |
| `/500` | 500 | "Something went wrong" | Crumpled paper |
| `/maintenance` | — | "We'll be right back" | Tool and wrench |
| `/suspended` | — | "Account suspended" | Caution tape |

Each error page:
- Shows the error code in large, styled typography
- Includes the headline and a short description
- Has a "Go home" button and a "Contact support" link
- In dark mode, illustrations adapt to the palette

### React Error Boundaries
Every major layout section wrapped in an `<ErrorBoundary>` component:

```tsx
// packages/ui/ErrorBoundary.tsx
// - Catches JS runtime errors in child component tree
// - Shows a fallback card: "This section failed to load" + "Try again" button
// - Reports error to Sentry with component stack
// - Never crashes the entire app — only the affected section degrades
```

Boundaries placed at:
- `<AppShell>` (outer — last resort)
- `<BoardView>`
- `<GanttView>`
- `<DashboardWidgets>` (each chart card individually)
- `<IssueDetail>`
- `<DocEditor>`


---

## Performance Budgets & Core Web Vitals

### Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse, field data |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| INP (Interaction to Next Paint) | < 200ms | Lighthouse |
| TTI (Time to Interactive) | < 3.5s | Lighthouse |
| JS bundle (initial) | < 200KB gzipped | `rollup-plugin-visualizer` |
| JS bundle (per route chunk) | < 80KB gzipped | Vite code splitting |
| API response p95 (list endpoints) | < 200ms | Prometheus histogram |
| API response p95 (write endpoints) | < 300ms | Prometheus histogram |

### Enforcement
- **Lighthouse CI** in GitHub Actions: fails PR if score drops below `performance: 80`.
  ```yaml
  # .lighthouserc.js
  module.exports = { ci: { assert: { preset: 'lighthouse:recommended',
    assertions: { 'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
                  'interactive':             ['error', { maxNumericValue: 3500 }] } } } };
  ```
- **Bundle size limit** via `bundlesize` or Vite's `build.chunkSizeWarningLimit`.
- `rollup-plugin-visualizer` generates a `stats.html` on every build for bundle composition review.

### Strategies
- Route-based **code splitting**: every page is a `React.lazy` chunk. Vite handles this automatically with dynamic `import()`.
- **Preload** critical routes on hover (`<Link onMouseEnter>` triggers `import()` prefetch).
- All chart libraries loaded lazily (only on dashboard/analytics routes).
- Gantt component dynamically imported with a `<Suspense fallback={<GanttSkeleton />}>`.
- **Font optimization**: Inter and JetBrains Mono loaded via `<link rel="preload">` with `font-display: swap`.
- **Image optimization**: all user-uploaded images served as WebP via S3 + CloudFront. `<img loading="lazy">` on non-above-fold images.
- **React 19 concurrent features**: use `useTransition` for non-urgent state updates (filter changes, search input) to keep UI responsive.

---

## Internationalization (i18n)

The codebase is architected for i18n from day one, even if only English ships initially.

### Setup — `react-i18next`
```
packages/
  i18n/
    locales/
      en/
        common.json       (shared UI strings: Save, Cancel, Delete, etc.)
        issues.json
        sprints.json
        auth.json
        errors.json
      fr/                 (placeholder — empty files committed)
      es/                 (placeholder)
    index.ts              (i18next init, language detection)
```

### Rules
- **No hardcoded strings in JSX**. Every user-facing string uses `t('key')` from `useTranslation()`.
- All date/time formatting via `Intl.DateTimeFormat` (no hardcoded format strings). Pass locale from user preferences.
- All number formatting via `Intl.NumberFormat`.
- RTL support scaffolded: `dir` attribute on `<html>` switches to `rtl` for Arabic/Hebrew locales.

### Language Preference
- Stored in `user_preferences.locale` (e.g., `en`, `fr`, `es`).
- Auto-detected on first visit from `Accept-Language` header, overridable in Settings → Preferences.

### Backend
- Error messages and email templates also use a minimal i18n map (key → translated string) — even if only English keys exist now.
- API always returns error `code` keys (not English prose) so frontend can translate independently.

---

## Timezone Handling

All timestamps stored as UTC in PostgreSQL (`TIMESTAMPTZ`). Display converts to the user's local timezone.

### User Timezone
- Stored in `user_preferences.timezone` (IANA timezone string, e.g., `America/New_York`).
- Auto-detected on signup from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Overridable in Settings → Preferences.
- Set as `X-Timezone: America/New_York` header on all API requests (read by API for any server-side date formatting in email templates).

### Frontend
- All date display uses `date-fns-tz`:
  ```ts
  import { formatInTimeZone } from 'date-fns-tz';
  formatInTimeZone(issue.due_date, userTimezone, 'MMM d, yyyy');
  ```
- Sprint start/end dates shown with timezone indicator: "Jun 1, 2026, 9:00 AM EDT".
- Due date inputs: store as UTC midnight of the selected date in user's timezone.
- "Today" / "This week" filter logic computed in user's timezone (not server timezone).

### Backend
- Email templates use the user's stored timezone for all date formatting.
- Analytics job (burndown, velocity) computes "day boundaries" in the org's primary timezone (`organizations.timezone` field).
- Cron jobs run in UTC; `organizations.timezone` used when computing "start of business day" for digest emails.


---

## Caching Strategy

Redis is the caching layer. Every cache entry has an explicit TTL and a defined invalidation strategy.

### Cache Catalog

| Cache Key Pattern | TTL | Content | Invalidated When |
|-------------------|-----|---------|-----------------|
| `board:{projectId}` | 30s | Full board state (issues grouped by status) | Any issue status/sprint change |
| `backlog:{projectId}` | 60s | Ordered backlog issue list | Issue rank/sprint change |
| `sprint:active:{projectId}` | 60s | Active sprint metadata | Sprint start/complete |
| `burndown:{sprintId}` | 1h | Burndown chart data | BullMQ analytics job completes |
| `velocity:{projectId}` | 1h | Velocity chart data (last 10 sprints) | Sprint completed |
| `cfd:{projectId}` | 1h | Cumulative flow diagram data | BullMQ analytics job |
| `analytics:org:{orgId}` | 5m | Org dashboard KPIs | Any issue create/complete |
| `flags:{orgId}` | 60s | Resolved feature flags for org | Any flag override change |
| `search:{orgId}:{query_hash}` | 5m | Search results | Any issue/doc write in org |
| `user:me:{userId}` | 5m | Current user profile + orgs | Profile update |
| `plan_limits:{orgId}` | 5m | Current usage counts for billing | Member/project create/delete |
| `rate_limit:{ip}:{route}` | sliding | Request count | TTL-based |
| `lockout:{email}` | 15m | Failed login attempt count | Successful login or TTL |
| `session_blacklist:{jti}` | = token expiry | Revoked token marker | Token expires |

### Cache-Aside Pattern (standard approach)
```ts
async function getBoard(projectId: string, orgId: string) {
  const cacheKey = `board:${projectId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const data = await db.getBoardData(projectId, orgId);
  await redis.set(cacheKey, JSON.stringify(data), 'EX', 30);
  return data;
}
```

### Cache Stampede Prevention
For expensive operations (burndown, CFD) with high concurrency:
- Use **probabilistic early expiration** (PER): re-compute before TTL expires with increasing probability.
- Or use **Redis locks** (`SET key:lock 1 NX EX 10`): first request acquires lock and recomputes; others wait and read stale.

### Write-Through on Critical Paths
Board state updated **write-through** (update DB + update cache atomically) for board card moves to avoid stale UI:
```ts
await prisma.issue.update({ where: { id }, data: { statusId, rank } });
await redis.del(`board:${projectId}`);  // invalidate — next read rebuilds
```

### Redis Memory Management
- `maxmemory-policy: allkeys-lru` in Redis config — evicts least-recently-used keys when memory is full.
- Monitor `redis_memory_used_bytes` in Prometheus. Alert at 80% of `maxmemory`.
- Separate Redis databases: `db 0` = cache, `db 1` = BullMQ, `db 2` = sessions/rate limiting. Allows independent flush.

---

## Search Architecture

Full-text search powered by PostgreSQL `tsvector` + `pg_trgm` for fuzzy matching, with a dedicated search indexing pipeline.

### Search Index

Every searchable table has a `search_vector tsvector` column maintained by a trigger:

```sql
-- Issues search vector (weighted: title A, description B, comments C)
CREATE OR REPLACE FUNCTION update_issue_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description_text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_search_vector_trigger
BEFORE INSERT OR UPDATE ON issues
FOR EACH ROW EXECUTE FUNCTION update_issue_search_vector();

CREATE INDEX issues_search_vector_idx ON issues USING GIN(search_vector);
```

Apply same pattern to: `docs`, `doc_pages`, `comments`, `projects`.

### Fuzzy Matching (typo tolerance)
```sql
-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX issues_title_trgm_idx ON issues USING GIN(title gin_trgm_ops);

-- Fuzzy title search (for typos/partial matches)
SELECT * FROM issues
WHERE title % 'authetication'   -- similarity threshold 0.3
ORDER BY similarity(title, 'authetication') DESC;
```

### Search Query
Combined: full-text rank + fuzzy fallback:
```sql
SELECT
  i.id, i.issue_key, i.title, i.status_id, i.priority, i.type,
  ts_rank(i.search_vector, query) AS rank
FROM issues i, plainto_tsquery('english', $1) query
WHERE
  i.org_id = $2
  AND i.deleted_at IS NULL
  AND (
    i.search_vector @@ query                        -- full-text match
    OR i.title % $1                                 -- fuzzy fallback
  )
ORDER BY rank DESC, i.updated_at DESC
LIMIT 20;
```

### Search Ranking Weights
- Issue title match: weight A (highest)
- Doc page title: weight A
- Issue description: weight B
- Doc body: weight B
- Comment body: weight C (lowest)
- Boost recently updated (multiply rank by `1 / log(days_since_update + 2)`)

### Search Scope
`GET /search?q=...&orgId=...&type=issue|doc|comment|member&projectId=...`

Result types returned in a unified response:
```ts
type SearchResult =
  | { type: 'issue'; issueKey: string; title: string; projectName: string; status: string; priority: string }
  | { type: 'doc';   title: string; projectName: string; excerpt: string }
  | { type: 'member'; fullName: string; avatarUrl: string; role: string };
```

### Search Indexing Pipeline
- On issue/doc/comment write → BullMQ `search-index` queue job → updates `description_text` (plaintext extracted from JSONB blocks) → trigger fires to update `search_vector`.
- Bulk re-index endpoint: `POST /admin/search/reindex` (platform_admin only) — queues all records.

### Search Analytics (stored, not real-time)
```sql
search_queries
  id          UUID PK
  org_id      UUID FK
  user_id     UUID FK
  query       TEXT
  result_count INTEGER
  clicked_result_id UUID nullable
  created_at  TIMESTAMPTZ
```
- Zero-result queries surfaced in Platform Admin → Search Analytics panel.
- Popular queries per org shown in Project Settings → Insights (pro plan).


---

## WebSocket Scaling

### Socket.io Redis Adapter
```ts
// apps/api/src/plugins/websocket.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

All Socket.io events now propagate across all API instances through Redis pub/sub. Enables horizontal scaling of WebSocket connections without sticky sessions at the load balancer level (though sticky sessions remain recommended for connection affinity).

### Room Strategy
```
org:{orgId}           — org-wide events (member joined, project created)
project:{projectId}   — project events (issue moved, sprint started)
issue:{issueId}       — issue detail events (comment added, field changed)
doc:{docId}           — doc collaboration events (block edited, comment added)
```

### Connection Limits
- Max 10,000 concurrent WebSocket connections per worker process.
- Each API instance handles ~5,000 connections (Socket.io internal limit, tunable).
- Scale horizontally: add API instances behind load balancer — Redis adapter keeps all in sync.
- Monitor `active_websocket_connections` Prometheus metric. Alert at 80% of capacity.

### Fallback & Reconnection
```ts
// apps/web/src/lib/socket.ts
const socket = io(WS_URL, {
  transports: ['websocket', 'polling'],  // try WebSocket first, fall back to long-polling
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30_000,
  reconnectionAttempts: Infinity,
});

socket.on('reconnect', () => {
  // Re-subscribe to rooms and fetch diff since last event
  queryClient.invalidateQueries({ queryKey: ['board', projectId] });
});
```

### State Reconciliation on Reconnect
When a client reconnects after a disconnect, it may have missed events. Strategy:
- Server tracks `last_event_seq` per room (monotonic integer in Redis).
- Client sends its last known `seq` on reconnect.
- Server sends missed events since that seq (from an in-memory ring buffer, last 100 events per room).
- If seq too old (> 100 events behind), client does a full data refetch instead.

---

## Data Import

Critical for user acquisition — teams can't switch unless they can bring their data.

### Supported Import Sources

**1. CSV Import (generic)**
- Template CSV downloadable from the import page.
- Columns: `title`, `type`, `status`, `priority`, `assignee_email`, `labels`, `due_date`, `description`, `parent_issue_key`, `sprint_name`.
- Mapped to project statuses by name (fuzzy match with confirmation step).
- Import wizard: Upload → Column Mapping → Preview (first 10 rows) → Confirm → Import.
- BullMQ `imports` queue processes rows in batches of 50.

**2. Jira Import**
- User exports Jira project as XML (Jira's built-in export).
- Upload XML file → parser extracts issues, subtasks, epics, sprints, comments, attachments.
- Field mapping:
  - Jira `Story` → our `story`
  - Jira `Bug` → our `bug`
  - Jira `Sub-task` → our `subtask`
  - Jira `Epic Link` → our `parent_id`
  - Jira `Sprint` → our `sprint`
  - Jira custom fields → stored in `issues.custom_fields JSONB`
- Attachments: downloaded from Jira URLs and re-uploaded to S3 (BullMQ job).
- Progress shown in a live import status page (`/orgs/:orgId/import/:importId`).

**3. Linear Import**
- User exports Linear workspace as CSV (from Linear settings).
- Field mapping similar to CSV import.
- Linear cycles → our sprints.
- Linear Teams → our Projects.

### Data Model
```
imports
  id           UUID PK
  org_id       UUID FK
  project_id   UUID FK
  source       TEXT    (csv | jira | linear)
  status       TEXT    (pending | processing | completed | failed)
  file_s3_key  TEXT
  total_rows   INTEGER
  processed_rows INTEGER
  error_log    JSONB[]  (per-row errors)
  created_by   UUID FK
  created_at   TIMESTAMPTZ
  completed_at TIMESTAMPTZ nullable
```

### API
```
POST   /orgs/:orgId/imports           (upload file, start import job)
GET    /imports/:importId             (status polling)
GET    /imports/:importId/errors      (row-level error report)
DELETE /imports/:importId             (cancel + rollback)
```

### Rollback
Import wrapped in a PostgreSQL transaction with a savepoint. On failure or user cancellation, all inserted records deleted cleanly.




---

## Wizards

Every multi-step flow in the app uses a consistent, beautiful **Wizard component** from `packages/ui`. No flow dumps the user into a form with 20 fields — each wizard breaks work into focused, low-anxiety steps.

---

### Wizard Component System (`packages/ui/Wizard`)

**Visual Design**
- Centered modal (desktop: `max-w-2xl`, full-screen on mobile as bottom sheet).
- **Step indicator**: horizontal progress bar at the top + numbered step dots (`●●○○`). Active step dot pulses with an indigo glow.
- **Left panel** (optional, for wider wizards): sticky illustration or animated icon that changes per step — fades between steps with Framer Motion `AnimatePresence`.
- **Right panel**: step content (form fields, choices, previews).
- **Footer**: `← Back` ghost button (disabled on step 1) + primary CTA `Next →` / `Finish` button. CTA shows a spinner while async work runs.
- Step transitions: slide left/right with spring physics (200ms).
- Error state: inline field errors + a toast if an API call fails (never kills the wizard).
- Keyboard: `Enter` advances to next step when all required fields are filled. `Escape` triggers the cancel confirmation.
- Cancel: clicking outside or pressing Escape shows a small confirmation popover ("Discard progress? Your changes won't be saved.").
- Progress persisted in local component state — navigating back never loses filled fields.
- On the final step: the CTA becomes "Create" / "Finish" / "Launch" (contextual). After success: the wizard closes with a **confetti burst** (canvas-confetti, 0.8s) and a success toast.

**Component API**
```tsx
<Wizard
  steps={steps}               // WizardStep[]
  onComplete={handleComplete} // (data: FormData) => Promise<void>
  onCancel={handleCancel}
  illustration={<StepIllustration step={currentStep} />}
/>

type WizardStep = {
  id: string;
  title: string;
  subtitle?: string;
  component: React.ComponentType<WizardStepProps>;
  validate?: (data: Partial<FormData>) => boolean | string;
  optional?: boolean;
};
```

---

### 1. Organization Signup Wizard

**Trigger**: `/signup` page, after email + password fields.
**Steps**: 4 steps

```
Step 1 — Your Account
  Illustration: Animated avatar with a waving hand
  Fields: Full name, Job title (optional), Avatar upload (drag or click)
  Hint: "This is how your teammates will see you."

Step 2 — Your Workspace
  Illustration: Building / office icon slowly growing
  Fields:
    - Organization name (auto-generates slug preview below: "yourcompany.app.com")
    - Slug (editable, availability checked live with debounce — green ✓ / red ✗)
    - Logo upload (optional, drag-and-drop with crop)
    - Industry (dropdown: Software, Marketing, Design, Agency, Other)
  Hint: "You can change these later in Settings."

Step 3 — Invite Your Team
  Illustration: Group of avatars appearing one by one
  Fields:
    - Multi-email input ("Add teammates by email, press Enter")
    - Role selector per invite (default: Member)
    - "Skip for now" link
  Hint: "Invites are sent immediately. They'll join your workspace when they accept."

Step 4 — Plan Selection
  Illustration: Rocket launching
  Content: Free vs Pro plan cards (side-by-side).
    Free card: feature list, "Start Free" CTA
    Pro card: feature list, price, "Start 14-day trial" CTA (highlighted, gradient border)
  No credit card required for trial.

Completion: workspace created, user logged in, redirected to /:orgSlug with onboarding checklist visible.
```

---

### 2. Project Creation Wizard

**Trigger**: "New Project" button on `/projects` page, or from the sidebar "+" icon.
**Steps**: 4 steps

```
Step 1 — Project Basics
  Illustration: Folder with a sparkle icon, color matching the chosen project color
  Fields:
    - Project name (large text input, autofocused)
    - Identifier (auto-generated from name, e.g., "ENG" from "Engineering" — editable, max 6 chars uppercase)
    - Description (optional textarea)
    - Project color picker (10 preset swatches + custom hex)
  The folder illustration animates to match the chosen color in real-time.

Step 2 — Project Type
  Illustration: Two side-by-side board previews (Scrum vs Kanban) — the selected one scales up
  Choice cards (full-width, icon + title + description):
    ┌─────────────────────────────────┐  ┌─────────────────────────────────┐
    │  🏃 Scrum                       │  │  📋 Kanban                       │
    │  Sprints, backlog, burndown     │  │  Continuous flow, WIP limits    │
    │  Best for: dev teams shipping   │  │  Best for: support, ops, design │
    │  in cycles                      │  │  queues                         │
    └─────────────────────────────────┘  └─────────────────────────────────┘
  Selecting one highlights it with an indigo ring + checkmark badge.

Step 3 — Workflow
  Illustration: Status columns flowing left to right
  Pre-built status templates as selectable cards:
    - Software Dev (Backlog → Todo → In Progress → In Review → Done)
    - Design (Ideas → Scoping → Design → Feedback → Shipped)
    - Marketing (Planned → Brief → In Production → Review → Published)
    - Support (Open → Triaging → In Progress → Resolved)
    - Custom (start blank)
  Selecting a template shows a live status lane preview below.
  "Customize statuses after creation" hint text.

Step 4 — Add Members
  Illustration: Avatars sliding into a project folder
  Fields:
    - Search existing org members by name/email (searchable dropdown)
    - Each selected member shown as an avatar chip with a role dropdown (Member / Viewer)
    - "Add all org members" shortcut
    - "Skip — I'll add members later" link

Completion: project created → redirected to /:orgSlug/:projectKey/board.
New board shows an empty state with a "Create your first issue" CTA that opens Issue Creation Wizard.
```

---

### 3. Issue Creation Wizard

**Trigger**: `C` keyboard shortcut, "+ New Issue" button, or issue creation from board/backlog.
**Steps**: 2 steps (intentionally fast)

```
Step 1 — Choose a Template  (skippable — "Quick Create" mode bypasses this)
  Layout: Full-width card grid (3 columns desktop, 1 column mobile)
  Template cards:
    ┌─────────────────┐
    │   🐛            │
    │  Bug Report     │
    │  Severity,      │
    │  repro steps    │
    └─────────────────┘
  Cards: icon (emoji), name, short description of pre-filled fields.
  "Blank Issue" card always first (ghost border style).
  Selecting a card highlights it and auto-advances to Step 2 after 200ms.

Step 2 — Issue Details
  Layout: Full TipTap editor (not a cramped modal — use a large Sheet/drawer)
  Left side: editor (title at top, body below)
  Right side: metadata sidebar:
    - Type badge selector (icon row: 🐛 Bug  ✨ Story  ✅ Task  ⚡ Epic  ↩ Subtask)
    - Status dropdown (shows project's custom statuses)
    - Priority selector (5 options with colored icons)
    - Assignee avatar picker
    - Sprint selector (current sprint highlighted)
    - Labels multi-select
    - Due date (calendar popover)
    - Estimate (number input + unit toggle: points / hours)
    - Parent issue (search field, shows epics)
  Template pre-fills body and sets default type/priority.
  "Create & add another" checkbox in footer for rapid issue entry.

Completion: issue created with optimistic UI update on board/backlog. Success toast with "View Issue" link.
```

---

### 4. Sprint Creation Wizard

**Trigger**: "New Sprint" button on Backlog or Sprints page.
**Steps**: 3 steps

```
Step 1 — Sprint Details
  Illustration: Calendar with a sprint finish line flag
  Fields:
    - Sprint name (default: "Sprint N" where N = next number, editable)
    - Sprint goal (textarea, max 200 chars, character counter)
      Placeholder: "What do we want to achieve this sprint?"
    - Start date (calendar picker, defaults to today or day after last sprint ends)
    - End date (calendar picker, defaults to start + team's configured sprint length)
    - Duration helper: "This sprint is 14 days — that's your standard length ✓"

Step 2 — Add Issues from Backlog
  Illustration: Issues flying from a stack into a sprint box
  Layout: two-column
    Left: "Backlog" — virtualized scrollable list of unscheduled issues
      Each row: priority icon, issue key, title, estimate badge
      Click to select (checkbox or click anywhere on row)
    Right: "This Sprint" — selected issues, total story points counter
      "Total: 23 pts / Team capacity: 40 pts" — capacity bar (green → yellow → red)
  Search box to filter backlog by title/assignee/label.
  "Add recommended issues" CTA: AI-suggested based on priority and labels (stub).

Step 3 — Confirm & Review
  Illustration: Rocket on a launch pad, countdown
  Summary card:
    - Sprint name + goal
    - Start date → End date (X days)
    - N issues selected, total Y story points
    - Capacity bar
  "Start Sprint immediately" toggle (if checked, sprint activates on creation).
  Warning if capacity > 100%: "⚠ This sprint may be over-capacity. Consider removing some issues."

Completion: sprint created. If "Start immediately" checked → transitions to active board.
```

---

### 5. Sprint Start Wizard

**Trigger**: "Start Sprint" button on the Backlog page (next to a Planned sprint).
**Steps**: 2 steps (lightweight confirmation)

```
Step 1 — Confirm Sprint
  Illustration: Starting gun / race flag animated
  Shows sprint summary: name, goal, dates, issue count, story points.
  If another sprint is active: warning banner "⚠ Sprint 'Sprint 4' is already active.
  Starting this sprint will not affect it — both sprints run in parallel.
  Are you sure?"
  Editable fields: sprint name, goal, start date, end date (final chance to adjust).

Step 2 — Team Notification
  Illustration: Notification bell ringing
  Options (checkboxes):
    ☑ Notify all project members via email
    ☑ Post a message in the activity feed
    ☐ Send a Slack message (if Slack integration configured)
  Preview of the notification message (editable).

Completion: sprint status → active. Board view opens automatically.
```

---

### 6. Sprint Completion Wizard

**Trigger**: "Complete Sprint" button on the active board.
**Steps**: 3 steps

```
Step 1 — Sprint Summary
  Illustration: Finish line with a trophy (animated bounce on enter)
  Summary stats displayed as KPI cards:
    ✅ 18 issues completed
    🔄 4 issues incomplete
    📊 Velocity: 32 pts (↑ vs last sprint avg: 28 pts)
    ⏱ Sprint duration: 14 days
  Burndown chart mini-preview.

Step 2 — Handle Incomplete Issues
  Illustration: Issues with question marks, branching arrows
  For each incomplete issue (listed with priority + assignee):
    Radio group: "Move to Backlog" | "Move to Next Sprint" | "Keep in this sprint"
  Bulk action bar: "Move all to Backlog" / "Move all to Next Sprint"
  Filter by: assignee, priority.
  "Next Sprint" selector (creates a new sprint if none planned).

Step 3 — Retrospective Notes (optional)
  Illustration: Notepad with a lightbulb
  Three text areas:
    - 🟢 What went well?
    - 🔴 What didn't go well?
    - 💡 What to improve?
  "Skip retrospective" link.
  Notes stored in `sprint.retrospective_notes JSONB`.

Completion: sprint status → completed. Analytics job queued. Velocity chart updated.
Redirect to Backlog with a "Sprint N complete 🎉" toast + confetti.
```

---

### 7. Member Invite Wizard

**Trigger**: "Invite Members" button in Org Settings → Members, or from the onboarding checklist.
**Steps**: 2 steps

```
Step 1 — Add Emails & Roles
  Illustration: Envelope with multiple avatars emerging
  Multi-email chip input:
    - Type/paste email, press Enter or comma to add
    - Validates email format on add
    - Paste a comma-separated list: all parsed at once
    - Up to 20 at a time
  Each chip shows: email + role dropdown inline (Admin / Manager / Member / Viewer)
  "Change all to:" role bulk-setter above the chip list.
  Suggested contacts (from previously invited users): shown as avatars below the input.

Step 2 — Preview & Confirm
  Illustration: Emails being sent (animated envelopes flying)
  Preview table:
    Email | Role | Status (New / Already a member)
  "Already a member" rows shown in muted style with a "Re-send invite" option.
  Personal message field (optional): prepended to invite email.
  "Invites expire after 7 days" info chip.

Completion: invites sent via BullMQ. Success toast: "N invites sent." Pending invites appear in the members table with a "Pending" badge.
```

---

### 8. MFA Setup Wizard

**Trigger**: Settings → Security → "Enable Two-Factor Authentication".
**Steps**: 3 steps

```
Step 1 — Install an Authenticator App
  Illustration: Phone with a shield icon
  Text: "Download an authenticator app if you don't have one."
  App suggestion chips (icon + name): Google Authenticator, Authy, 1Password, Bitwarden
  Each chip links to the app store.
  "I already have one →" skips to step 2.

Step 2 — Scan QR Code
  Illustration: QR code (generated server-side with otplib)
  Large QR code in center.
  "Can't scan?" expandable: shows the manual TOTP secret key (monospace, copyable).
  Warning: "Never share this key."

Step 3 — Verify Code
  Illustration: Checkmark shield (animates to green checkmark on success)
  6-digit OTP input (auto-advances between digit boxes, auto-submits on 6th digit).
  Error state: input shakes + "Incorrect code. Try again." message.
  On success: shows 8 recovery codes in a monospace grid.
    "Download codes" button (saves .txt file).
    "Copy all codes" button.
    Checkbox: "I've saved my recovery codes" (required to proceed).

Completion: MFA enabled. Badge on Settings → Security → "2FA: Enabled ✓".
```

---

### 9. API Key Creation Wizard

**Trigger**: Settings → API Keys → "Generate New Key".
**Steps**: 2 steps

```
Step 1 — Configure Key
  Illustration: Key with sparkle
  Fields:
    - Key name (e.g., "CI/CD Pipeline", "Zapier Integration")
    - Expiry (radio: 30 days / 90 days / 1 year / Never)
    - Scopes (checkbox list, grouped):
        Read  — issues:read, projects:read, sprints:read
        Write — issues:write, projects:write, comments:write
        Admin — members:write, settings:write
      "Select all" toggle per group.

Step 2 — Copy Your Key
  Illustration: Safe opening, key emerging with a glow
  Warning banner: "⚠ This key will only be shown once. Copy it now."
  Generated key displayed in a monospace box with a "Copy" button + one-click highlight.
  Key masked after 10 seconds (click to reveal again for 5 seconds).
  "I've copied my key" checkbox required before "Done" button enables.

Completion: key listed in Settings → API Keys table (masked, shows name + expiry + last used).
```

---

### 10. Webhook Creation Wizard

**Trigger**: Project Settings → Integrations → Webhooks → "Add Webhook".
**Steps**: 3 steps

```
Step 1 — Endpoint
  Illustration: Server with an outgoing arrow
  Fields:
    - Endpoint URL (validated for HTTPS on blur — HTTP rejected with explanation)
    - Secret token (auto-generated, copyable, used for HMAC-SHA256 signature)
    - Description (optional)

Step 2 — Choose Events
  Illustration: Event stream with checkmarks
  Grouped event checkboxes:
    Issues:   created, updated, deleted, status_changed, assigned
    Sprints:  started, completed
    Comments: created
    Members:  invited, removed
    Projects: created, archived
  "Select all" / "Deselect all" per group.
  Event count badge: "12 events selected"

Step 3 — Test & Save
  Illustration: Ping animation (radio waves from server)
  "Send test event" button → fires a sample `ping` POST to the endpoint.
  Result panel shows:
    ✅ Status: 200 OK (green) / ❌ Status: 404 (red)
    Response body (collapsible code block)
    Response time: Xms
  "Retry test" button.
  Note: "You can save without a successful test."

Completion: webhook saved + activated. Delivery log accessible from the webhook detail page.
```

---

### 11. GitHub / GitLab Integration Setup Wizard

**Trigger**: Project Settings → Integrations → GitHub → "Connect".
**Steps**: 3 steps

```
Step 1 — Authorize
  Illustration: Octocat / GitLab fox + app logo connected by a glowing bridge
  Description of what the integration does:
    - Link PRs and branches to issues
    - Auto-transition issue status when PR is merged
    - Show CI status on issue cards
  "Authorize with GitHub" button → opens OAuth popup.
  Popup closed callback updates step status to "Authorized ✓".

Step 2 — Select Repository
  Illustration: Repository shelf
  Search input: "Search your repositories..."
  Scrollable list of repos (fetched from GitHub API):
    Each row: repo icon, name, visibility badge (Public/Private), last updated
  Single selection (radio).
  Pagination or "Load more" for many repos.

Step 3 — Configure Automation
  Illustration: Branch merging into a checkmark
  Settings:
    ☑ Auto-close issue when linked PR is merged (set status to "Done")
    ☑ Auto-link branches matching issue key (e.g., "feat/ENG-42-login")
    ☑ Show CI status badge on issue cards
    ☐ Post a comment on the issue when a PR is opened

Completion: integration active. PR links appear on issue detail pages within 60s.
```

---

### 12. Billing Upgrade Wizard

**Trigger**: "Upgrade" button in org settings, or plan limit 402 response modal.
**Steps**: 2 steps

```
Step 1 — Choose Your Plan
  Illustration: Rocket ship ascending tiers (free → pro → enterprise)
  Plan comparison cards (side-by-side, desktop; stacked mobile):
    ┌────────────── PRO ──────────────┐
    │  $12 / user / month             │
    │  (billed monthly or annually)   │
    │                                 │
    │  ✓ Unlimited projects           │
    │  ✓ Unlimited automations        │
    │  ✓ 50 GB storage                │
    │  ✓ Advanced analytics           │
    │  ✓ Custom domain                │
    │                                 │
    │  Seats: [  5  ] +-              │
    │  Total: $60 / month             │
    │                                 │
    │  [  Start 14-day trial  ]       │
    └─────────────────────────────────┘
  Annual toggle: "Pay annually — save 20%". Prices update with animation.
  Enterprise card: feature list + "Contact Sales" CTA.

Step 2 — Payment
  Illustration: Credit card with a shield (Stripe-secured badge)
  Note: "You'll be redirected to Stripe's secure checkout."
  Summary box: Plan, seats, billing period, total.
  "Start Trial" (no card now) vs "Subscribe" (Stripe Checkout) — depends on trial eligibility.
  Trial path: skips payment, activates trial immediately.

Completion: subscription active. Plan badge updated in org settings.
Confetti + "Welcome to Pro 🎉" toast.
```

---

### 13. Data Import Wizard

**Trigger**: Org Settings → Import → "Import Data" button.
**Steps**: 4 steps

```
Step 1 — Choose Source
  Illustration: Filing cabinet with source logos on drawers
  Source cards (full-width, selectable):
    📊 CSV (generic spreadsheet)
    🔵 Jira (upload XML export)
    🟣 Linear (upload CSV export)
    📝 Trello (upload JSON export)  [future stub]
  Each card: logo, name, short description, "Export guide →" link.

Step 2 — Upload File
  Illustration: File flying into a cloud (animated)
  Large drag-and-drop zone:
    "Drag your file here, or click to browse"
    Accepts: .csv / .xml / .json depending on source
    Max file size: 50MB
  After upload: file name + size shown with a ✓.
  "Download template" link for CSV source.
  For Jira: step-by-step mini-guide on how to export from Jira (expandable accordion).

Step 3 — Map Fields / Preview
  Illustration: Two columns with arrows connecting fields
  For CSV:
    Column mapping table:
      Your CSV column | Maps to | Preview (first 3 values)
      "Title"         | Title   | "Fix login bug", "Add darkmode"...
      "Assignee"      | Assignee Email | "john@co.com"...
    Dropdowns for each mapping (unmapped columns shown in yellow).
    "Ignore this column" option.
  For Jira/Linear:
    Auto-mapped. Show a read-only summary of what was detected:
      "271 issues, 12 sprints, 4 epics, 48 comments detected."
    Unmapped custom fields listed with "Skip" / "Map to label" options.
  Data preview table: first 5 rows with mapped values.

Step 4 — Confirm Import
  Illustration: Checklist being ticked off
  Summary:
    - Source: Jira
    - Target project: [dropdown — select or create new project]
    - N issues to import
    - N sprints to import
    - N members to map (shows unmatched emails with "Invite" option)
    - Estimated time: ~2 minutes
  Warning: "Import cannot be undone. Issues will be created in the selected project."
  "I understand — Start Import" CTA (disabled until checkbox checked).

Completion: BullMQ import job queued. Redirect to live import progress page:
  /:orgSlug/import/:importId
  Progress bar + live log (WebSocket): "Importing issue 45 of 271..."
  On completion: "Import complete ✅ — 271 issues created, 3 skipped (see errors)"
```

---

### 14. Account Deletion Wizard

**Trigger**: Settings → Privacy → "Delete My Account" (danger zone).
**Steps**: 3 steps (intentionally slowed — irreversible action)

```
Step 1 — What Will Be Deleted
  Illustration: Data files dissolving (red tones)
  Checklist of consequences (with icons):
    💀 Your profile and login credentials
    📋 All issues and comments you created
    🔔 All your notifications and preferences
    🔑 All your active sessions and API keys
  Warning box (rose background):
    "This action is permanent and cannot be undone.
     Your data will be anonymized and removed within 30 days."
  "Export my data first →" link (opens Data Export flow).

Step 2 — Transfer Ownership (if user is only tenant_admin of any org)
  Illustration: Crown passing to another person
  For each org where user is the sole admin:
    "Transfer ownership of [Org Name]"
    Assignee search (pick another member)
  OR "Delete this organization too" toggle (shows cascading data warning).
  User cannot proceed until all orgs have another admin or are marked for deletion.

Step 3 — Confirm
  Illustration: Final confirmation lock
  Type-to-confirm input: "Type DELETE to confirm"
    Input styled in red when text matches — submit button activates.
  Password confirmation field.
  Final warning: "We'll send a confirmation email. Your account will be deleted immediately."

Completion: account deletion job queued. User logged out. Redirect to /goodbye page
(simple branded page: "Account deleted. We're sorry to see you go.").
```

---

### 15. Org Deletion Wizard

**Trigger**: Org Settings → Danger Zone → "Delete Organization" (tenant_admin only).
**Steps**: 3 steps

```
Step 1 — Impact Summary
  Illustration: Organization dissolving
  Stats of what will be deleted:
    - N projects
    - N issues
    - N team members (access revoked)
    - N GB of file attachments
  "Download org data" button available.

Step 2 — Notify Members
  Illustration: Email envelopes going out
  ☑ Send email notification to all members before deletion
  Editable message field (sent with deletion notice).
  Deletion scheduled: "immediately" or "in 7 days" (gives members time to export).

Step 3 — Confirm
  Type-to-confirm: "Type your org name [ACME] to confirm"
  Password field.
  "Delete Organization" button styled in rose red.

Completion: org suspended immediately (members get 403), deletion job queued.
```

---

### Wizard Route Map

| Wizard | Route / Trigger | Steps |
|--------|----------------|-------|
| Org Signup | `/signup` | 4 |
| Project Creation | `/:orgSlug/projects` → New Project | 4 |
| Issue Creation | `C` shortcut / "+ New Issue" | 2 |
| Sprint Creation | Backlog → New Sprint | 3 |
| Sprint Start | Backlog → Start Sprint | 2 |
| Sprint Completion | Board → Complete Sprint | 3 |
| Member Invite | Settings → Members → Invite | 2 |
| MFA Setup | Settings → Security → Enable 2FA | 3 |
| API Key Creation | Settings → API Keys → New Key | 2 |
| Webhook Creation | Project Settings → Webhooks → Add | 3 |
| GitHub/GitLab Setup | Project Settings → Integrations | 3 |
| Billing Upgrade | Settings → Billing → Upgrade | 2 |
| Data Import | Org Settings → Import | 4 |
| Account Deletion | Settings → Privacy → Delete Account | 3 |
| Org Deletion | Org Settings → Danger Zone | 3 |


---

## Testing Strategy

A comprehensive, multi-layer testing approach covering every part of the stack.

### Testing Stack

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Domain logic, utils, permission checks, email helpers |
| Integration | Vitest + Supertest | API routes, DB queries, BullMQ jobs |
| E2E | Playwright | Critical user journeys |
| Visual regression | Chromatic (Storybook) | UI components |
| Load / perf | k6 | Board, search, WebSocket |
| Accessibility | axe-core + jest-axe | WCAG compliance |
| Security SAST | CodeQL (GitHub) | Static analysis |
| Coverage | Vitest `--coverage` (v8) | Enforce 80% threshold |

---

### Unit Tests

Location: co-located with source — `src/services/__tests__/`, `src/utils/__tests__/`

**What to unit-test:**
- All service functions (happy path + every error branch)
- `can(user, action, resource)` permission utility — one test per permission matrix cell
- Email renderer (template compilation, variable substitution, helper functions)
- Zod schema validation (valid inputs pass, invalid inputs fail with correct error codes)
- BullMQ job payload builders
- Handlebars template helpers (`formatDate`, `priorityIcon`, etc.)
- Plan limits checker (`checkPlanLimit`)
- Correlation ID generation and propagation
- Slug generation and uniqueness logic
- Issue key generator (`ENG-42` incrementing)

**Coverage thresholds** (`vitest.config.ts`):
```ts
coverage: {
  provider: 'v8',
  thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
  exclude: ['**/*.test.ts', '**/migrations/**', '**/seed.ts', '**/*.d.ts'],
}
```

**Test data factories** (`packages/shared/test-factories/`):
```ts
// Use @faker-js/faker for realistic data
import { faker } from '@faker-js/faker';

export const userFactory = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  fullName: faker.person.fullName(),
  platformRole: null,
  ...overrides,
});

export const issueFactory = (overrides = {}) => ({
  id: faker.string.uuid(),
  orgId: faker.string.uuid(),
  projectId: faker.string.uuid(),
  issueKey: `ENG-${faker.number.int({ min: 1, max: 999 })}`,
  title: faker.lorem.sentence(),
  type: 'task',
  priority: 'medium',
  status: 'todo',
  ...overrides,
});

// Factories for: org, project, sprint, epic, comment, label, member, attachment
```

---

### Integration Tests

Location: `apps/api/src/__tests__/integration/`

**Setup:**
- Separate test database: `pm_test` — created fresh before test suite runs.
- Each test file wraps in a transaction, rolled back in `afterEach` — no state leaks.
- Supertest mounts the Fastify app without starting a real HTTP server.
- Redis: use `ioredis-mock` for unit tests, real Redis for integration tests.
- BullMQ: `QueueEvents` with `wait()` to assert job completion in integration tests.

```ts
// apps/api/src/__tests__/setup.ts
beforeAll(async () => {
  await prisma.$connect();
  await runMigrations(); // ensure schema is current
});

beforeEach(async () => {
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  await prisma.$executeRaw`ROLLBACK`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

**What to integration-test per route group:**

*Auth routes:*
- `POST /auth/signup` — creates user + org, sends verify email job
- `POST /auth/login` — returns tokens, creates session row
- `POST /auth/login` — wrong password increments lockout counter
- `POST /auth/login` — locked account returns 423 with retry-after
- `POST /auth/refresh` — rotates refresh token, returns new access token
- `POST /auth/refresh` — reused token invalidates entire family + returns 401

*RBAC tests (critical):*
- Every protected route called with each role: assert 200 for allowed, 403 for forbidden
- `tenant_guest` cannot access cross-project routes
- `platform_support` read-only: GET succeeds, POST/PATCH/DELETE returns 403
- Tenant isolation: org A user cannot read org B's issues (even with valid JWT)

*RLS tests:*
- Connect as `app_user`, set `app.current_org_id` to org A, attempt to SELECT org B's issue → 0 rows returned
- Attempt UPDATE on org B issue → 0 rows affected

*BullMQ job tests:*
- Create issue with assignee → `notifications` queue job created with correct payload
- Sprint complete → `analytics` queue job fires → burndown cache updated

---

### E2E Tests (Playwright)

Location: `apps/web/e2e/`

**Config:**
```ts
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
});
```

**Fixtures** — pre-seeded test users/orgs shared across tests:
```ts
// e2e/fixtures.ts
export const test = base.extend<{
  orgAdminPage: Page;
  memberPage: Page;
  viewerPage: Page;
}>({
  orgAdminPage: async ({ browser }, use) => {
    // authenticate as org admin, reuse saved storage state
    const page = await browser.newPage({ storageState: 'e2e/.auth/admin.json' });
    await use(page);
  },
});
```

**Test Scenarios:**

| Journey | Steps |
|---------|-------|
| Full signup | Sign up → verify email → create org → create project → create issue |
| Kanban workflow | Create issue → drag to In Progress → drag to Done → verify activity log |
| Sprint lifecycle | Create sprint → add issues → start sprint → move issue to done → complete sprint → verify burndown |
| Member invite | Invite by email → accept invite → verify access level |
| RBAC enforcement | viewer attempts to create issue → assert button disabled + API returns 403 |
| Bulk actions | Select 5 issues → bulk assign → verify all updated |
| Search | Create 3 issues with unique titles → Cmd+K → search → click result → verify navigation |
| Billing upgrade | Click upgrade → select Pro → mock Stripe → verify plan badge updated |
| Dark mode | Toggle theme → reload → assert preference persisted |
| Mobile board | iPhone 14 viewport → tap column tab → tap card → fill issue form → save |
| Notification | User A assigns issue to User B → User B checks notification bell → verify unread count |

---

### Visual Regression Tests (Storybook + Chromatic)

Every component in `packages/ui` has a Storybook story:
```ts
// packages/ui/src/components/Button/Button.stories.tsx
export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Button variant="default">Default</Button>
      <Button variant="gradient">Gradient</Button>
      <Button variant="destructive">Delete</Button>
      {/* ... */}
    </div>
  ),
};
```

Chromatic publishes stories on every PR. Visual diffs require manual approval before merge.
Stories cover: light mode, dark mode, loading state, error state, empty state, all responsive breakpoints.

---

### Accessibility Tests

**Automated (axe-core in Playwright):**
```ts
// e2e/a11y.spec.ts
import { checkA11y } from 'axe-playwright';

test('Board page has no accessibility violations', async ({ page }) => {
  await page.goto('/:orgSlug/:projectKey/board');
  await checkA11y(page, undefined, {
    axeOptions: { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } },
  });
});
```
Run against: login page, board, backlog, issue detail, settings, admin dashboard.

**Unit-level (jest-axe):**
```ts
// packages/ui/src/components/Modal/__tests__/Modal.test.tsx
it('has no axe violations', async () => {
  const { container } = render(<Modal open title="Test"><p>Content</p></Modal>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

### Load / Performance Tests (k6)

Location: `tests/load/`

**Scenarios:**
```js
// tests/load/board.js — simulates 50 concurrent users loading the Kanban board
export const options = {
  scenarios: {
    board_load: {
      executor: 'ramping-vus',
      startVUs: 0, stages: [
        { duration: '30s', target: 50 },
        { duration: '1m',  target: 50 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95th percentile under 200ms
    http_req_failed:   ['rate<0.01'],  // error rate under 1%
  },
};
```

Scenarios: board load, search (50 concurrent queries), WebSocket connection ramp (200 concurrent), sprint complete (write-heavy).

---

### Security Testing

- **CodeQL** (GitHub Advanced Security): runs on every PR, scans for injection, hardcoded secrets, insecure deserialization.
- **SAST with Semgrep**: custom rules for `prisma.$executeRawUnsafe` with string interpolation.
- **Dependency audit**: `npm audit --audit-level=high` + Snyk in CI pipeline (fails on high/critical CVEs).
- **DAST stub**: OWASP ZAP baseline scan against staging environment on every deploy to staging.
- **Secret scanning**: GitHub secret scanning enabled; `gitleaks` pre-commit hook scans staged files for accidental secrets.


---

## CI/CD Pipeline

### GitHub Actions Workflows

#### 1. CI — Pull Request (`ci.yml`)

Triggers on every push to a non-main branch and every PR.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches-ignore: [main]
  pull_request:

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run test -- --coverage
      - uses: actions/upload-artifact@v4
        with: { name: coverage, path: '**/coverage/' }
      - uses: codecov/codecov-action@v4

  integration-tests:
    runs-on: ubuntu-latest
    needs: lint-typecheck
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: pm_test, POSTGRES_USER: app_user, POSTGRES_PASSWORD: test }
        options: --health-cmd pg_isready
      redis:
        image: redis:7-alpine
        options: --health-cmd "redis-cli ping"
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @pm/db migrate
        env: { DATABASE_URL: postgresql://app_user:test@localhost:5432/pm_test }
      - run: pnpm --filter @pm/api test:integration
        env:
          DATABASE_URL: postgresql://app_user:test@localhost:5432/pm_test
          REDIS_URL: redis://localhost:6379
          JWT_PRIVATE_KEY: ${{ secrets.TEST_JWT_PRIVATE_KEY }}

  security-scan:
    runs-on: ubuntu-latest
    permissions: { security-events: write }
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: javascript-typescript }
      - uses: github/codeql-action/analyze@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high
      - uses: snyk/actions/node@master
        env: { SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }} }
        with: { args: --severity-threshold=high }

  build:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build
      - uses: actions/upload-artifact@v4
        with: { name: build-artifacts, path: '**/dist/' }

  lighthouse:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile && pnpm --filter @pm/web build
      - uses: treosh/lighthouse-ci-action@v11
        with:
          configPath: .lighthouserc.js
          uploadArtifacts: true
```

#### 2. Preview Deploy (`preview.yml`)

Triggers on PR open/update. Deploys a preview environment and runs E2E tests against it.

```yaml
# .github/workflows/preview.yml
name: Preview Deploy
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    outputs:
      preview-url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - id: deploy
        uses: railwayapp/deploy-action@v1   # or Render / Fly.io equivalent
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          environment: preview-pr-${{ github.event.number }}

  e2e-tests:
    needs: deploy-preview
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @pm/web playwright install --with-deps chromium
      - run: pnpm --filter @pm/web test:e2e
        env:
          E2E_BASE_URL: ${{ needs.deploy-preview.outputs.preview-url }}
          E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL }}
          E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report/ }

  comment-preview-url:
    needs: [deploy-preview, e2e-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              body: `✅ Preview deployed: ${{ needs.deploy-preview.outputs.preview-url }}\n🧪 E2E tests: passed`
            })
```

#### 3. Deploy to Production (`deploy-prod.yml`)

Manual trigger only. Runs migrations before app deploy.

```yaml
# .github/workflows/deploy-prod.yml
name: Deploy Production
on:
  workflow_dispatch:
    inputs:
      confirm: { description: 'Type DEPLOY to confirm', required: true }

jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - if: ${{ github.event.inputs.confirm != 'DEPLOY' }}
        run: echo "Confirmation failed" && exit 1

  migrate:
    needs: guard
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @pm/db migrate:deploy
        env: { DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }} }

  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & push Docker images
        run: |
          docker build -t ghcr.io/${{ github.repository }}/api:${{ github.sha }} -f apps/api/Dockerfile .
          docker build -t ghcr.io/${{ github.repository }}/web:${{ github.sha }} -f apps/web/Dockerfile .
          docker push ghcr.io/${{ github.repository }}/api:${{ github.sha }}
          docker push ghcr.io/${{ github.repository }}/web:${{ github.sha }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Rolling deploy
        run: |
          # Update ECS service / Railway prod environment / Fly.io
          # Health check endpoint polled until 200 before marking deploy complete
      - name: Smoke tests
        run: curl --fail ${{ secrets.PROD_URL }}/health/ready
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: '{"text":"🚀 Production deploy ${{ job.status }}: ${{ github.sha }}"}'
        env: { SLACK_WEBHOOK_URL: ${{ secrets.SLACK_DEPLOY_WEBHOOK }} }

  rollback-on-failure:
    needs: deploy
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Rollback to previous image
        run: |
          # Re-deploy previous Docker image tag
          # Migrations are forward-only — no DB rollback
          echo "Rolling back to previous stable image..."
```

### Dockerfiles

**Multi-stage Dockerfile (API):**
```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm --filter @pm/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**`docker-compose.prod.yml`** — used for single-server deployments:
```yaml
services:
  postgres: { image: postgres:16, volumes: [pgdata:/var/lib/postgresql/data], ... }
  redis:    { image: redis:7-alpine, command: redis-server --save 60 1 --loglevel warning }
  pgbouncer:{ image: bitnami/pgbouncer:1, ... }
  api:      { image: ghcr.io/org/pm-api:latest, depends_on: [postgres, redis] }
  worker:   { image: ghcr.io/org/pm-api:latest, command: node dist/worker.js }
  web:      { image: ghcr.io/org/pm-web:latest }
  nginx:    { image: nginx:alpine, ports: ["80:80", "443:443"], volumes: [./nginx.conf:/etc/nginx/nginx.conf] }
```


---

## SSO & Social Login

### Social Login (OAuth 2.0)

Available on the login and signup pages as one-click buttons:

| Provider | Button Label | Scopes Requested |
|----------|-------------|-----------------|
| Google | Continue with Google | `openid email profile` |
| GitHub | Continue with GitHub | `user:email` |
| Microsoft | Continue with Microsoft | `openid email profile` |

**Flow:**
1. User clicks provider button → redirected to provider's OAuth consent screen.
2. Provider redirects back to `/auth/callback/:provider?code=...&state=...`.
3. API exchanges code for access token, fetches user profile.
4. **Existing user** (email match): log in, create session, return tokens.
5. **New user**: create `users` record, create `sessions`, trigger onboarding wizard.
6. CSRF protection: `state` parameter is a signed nonce verified on callback.
7. `user_oauth_accounts` table links users to provider accounts:
   ```
   user_oauth_accounts
     user_id       UUID FK
     provider      TEXT     (google | github | microsoft)
     provider_id   TEXT     (provider's user ID)
     email         TEXT
     access_token  TEXT (encrypted)
     refresh_token TEXT (encrypted)
     expires_at    TIMESTAMPTZ
     PRIMARY KEY (provider, provider_id)
   ```

**Settings → Security → Connected Accounts**: list linked providers, "Connect" / "Disconnect" per provider. Cannot disconnect last auth method if no password set.

---

### SAML 2.0 SSO (Enterprise Plan)

Enterprise tenants can configure SAML 2.0 SSO with their Identity Provider (IdP).

**Supported IdPs:** Okta, Azure AD, OneLogin, Google Workspace, PingIdentity, generic SAML 2.0.

**Library:** `samlify` (npm).

**Setup Wizard** (adds to Wizard section — 4 steps):
```
Step 1 — Choose IdP
  Cards: Okta, Azure AD, Google Workspace, OneLogin, Other
  Selecting a provider pre-fills metadata URL template.

Step 2 — Configure IdP
  Two sub-options:
    a) Metadata URL: "https://your-idp.com/saml/metadata" (auto-fetches XML)
    b) Manual: paste IdP Entity ID, SSO URL, X.509 Certificate
  Download Service Provider metadata XML for upload to IdP.

Step 3 — Attribute Mapping
  Map IdP attributes to app fields:
    Email (required):    [email ▾]
    Full Name:           [displayName ▾]
    First Name:          [firstName ▾]
    Role (optional):     [role ▾]
  Custom attribute for platform_admin: configure role claim value → platform_admin.

Step 4 — Test & Activate
  "Test SSO Login" button: opens popup with IdP login. On success → green ✓.
  "Enforce SSO" toggle: when enabled, email+password login disabled for all org members.
```

**Data Model:**
```
saml_configs
  org_id              UUID PK FK
  idp_entity_id       TEXT
  idp_sso_url         TEXT
  idp_certificate     TEXT
  sp_entity_id        TEXT     (generated: https://app.com/saml/metadata/:orgSlug)
  attribute_email     TEXT DEFAULT 'email'
  attribute_full_name TEXT DEFAULT 'displayName'
  attribute_role      TEXT nullable
  enforce_sso         BOOLEAN DEFAULT false
  active              BOOLEAN DEFAULT true
  created_at          TIMESTAMPTZ
```

**API Routes:**
```
GET    /orgs/:orgId/saml/metadata          (SP metadata XML — public, for IdP config)
POST   /auth/saml/:orgSlug                 (initiate SAML login)
POST   /auth/saml/:orgSlug/callback        (assertion consumer service)
GET    /orgs/:orgId/saml/config            (tenant_admin)
PUT    /orgs/:orgId/saml/config
POST   /orgs/:orgId/saml/test
DELETE /orgs/:orgId/saml/config
```

---

### Just-in-Time (JIT) Provisioning

When a user logs in via SAML/OAuth for the first time with an email domain claimed by an org:
1. User account created automatically (no separate invite required).
2. User added to the org as `tenant_member` (default) or role from SAML attribute.
3. Welcome email sent (`member.welcome` template).
4. Onboarding wizard shown on first login.

**Domain Claim:**
```
org_domain_claims
  id        UUID PK
  org_id    UUID FK
  domain    TEXT UNIQUE   (e.g., 'acme.com')
  verified  BOOLEAN DEFAULT false
  txt_token TEXT           (DNS TXT record to verify ownership)
  verified_at TIMESTAMPTZ nullable
```

Org admin adds a domain claim → DNS TXT record shown → verify button polls DNS. Once verified, all `@acme.com` OAuth/SAML logins auto-join the org.

---

## Custom Fields

User-defined fields per project to extend the issue data model without schema changes.

### Data Model

```sql
custom_field_definitions
  id           UUID PK
  project_id   UUID FK → projects
  org_id       UUID FK
  name         TEXT                  -- "Customer Tier", "Bug Source", "Story Points v2"
  field_key    TEXT                  -- snake_case key: "customer_tier"
  type         TEXT                  -- text | number | date | single_select | multi_select | user | url | checkbox
  options      JSONB nullable        -- [{ value: "enterprise", color: "#6366F1", label: "Enterprise" }]
  required     BOOLEAN DEFAULT false
  position     INTEGER               -- display order in issue detail
  show_on_card BOOLEAN DEFAULT false -- show on board card
  created_by   UUID FK → users
  created_at   TIMESTAMPTZ

custom_field_values
  id           UUID PK
  issue_id     UUID FK → issues
  field_id     UUID FK → custom_field_definitions
  org_id       UUID FK
  value_text   TEXT nullable
  value_number NUMERIC nullable
  value_date   DATE nullable
  value_json   JSONB nullable        -- for multi_select, user (array of ids)
  updated_at   TIMESTAMPTZ
  UNIQUE (issue_id, field_id)
```

### Field Types

| Type | UI Component | Storage Column |
|------|-------------|----------------|
| `text` | Single-line input | `value_text` |
| `number` | Number input with optional unit | `value_number` |
| `date` | Date picker | `value_date` |
| `single_select` | Dropdown with colored options | `value_text` (option value) |
| `multi_select` | Multi-select chips | `value_json` (string[]) |
| `user` | Member avatar picker | `value_json` (userId[]) |
| `url` | URL input with link preview | `value_text` |
| `checkbox` | Toggle switch | `value_number` (0/1) |

### UI

**Issue Detail** — custom fields appear in a "Custom Fields" section of the metadata sidebar:
- Each field rendered as its typed component.
- Inline edit, auto-save on blur/change.
- Empty required fields shown with a red dot.

**Board Card** — fields with `show_on_card = true` rendered as small chips below the issue title.

**Backlog / List View** — custom fields available as additional columns (user toggles columns).

**Filters** — custom fields appear in the filter panel:
- Text: contains/equals
- Number: equals/greater than/less than
- Single select: is/is not
- Date: before/after/on

**Project Settings → Custom Fields:**
- Field list with drag-to-reorder
- Create field wizard (2 steps: type selection → configuration)
- Edit, disable, or delete fields
- For `single_select` / `multi_select`: option manager with color pickers

### API
```
GET    /projects/:projectId/custom-fields
POST   /projects/:projectId/custom-fields
PATCH  /custom-fields/:fieldId
DELETE /custom-fields/:fieldId
GET    /issues/:issueId/custom-field-values
PATCH  /issues/:issueId/custom-field-values  (bulk upsert)
```

### Search & Export
Custom field values included in full-text search (`tsvector` updated on value change for text fields). Included in CSV/Excel exports as additional columns.


---

## Issue Dependency Graph

A visual graph view showing relationships between issues — blocks, is blocked by, duplicates, relates to.

### Visual Design

- **D3.js** force-directed graph or **Dagre** (directed acyclic graph layout for cleaner tree rendering).
- Nodes: issue cards (key + title truncated, priority color border, status badge).
- Edges: directed arrows color-coded by relationship type:
  - 🔴 `blocks` — red arrow (from blocker to blocked)
  - 🟡 `relates_to` — gray arrow
  - 🔵 `duplicates` — blue dashed arrow
- Node size: larger for epics, standard for stories/tasks/bugs.
- Hovered node: expands to show full title + assignee avatar + due date tooltip.
- Clicked node: opens issue detail sheet.
- **Critical path** highlighted: longest dependency chain blocking the sprint goal rendered in amber. Chain length shown as a badge on the chain's source node.
- **Cycle detection**: if a dependency cycle is introduced, a red banner appears and the save is blocked with a warning.

### Access Points
- Issue detail page → "Dependency Graph" tab (shows graph centered on this issue, ±2 hops).
- Sprint board → toolbar "Dependency View" toggle (shows all sprint issues in graph layout).
- Epic detail → graph of all child issues and their cross-dependencies.

### Interactions
- Pan: drag background.
- Zoom: scroll wheel or pinch.
- Add link: drag from one node's edge handle to another (opens "Link type" dropdown to confirm).
- Remove link: hover edge → click ✕.
- Filter: show only `blocks` links, or only `in-progress` nodes.
- Export as PNG.

### Implementation
```ts
// packages/ui/src/components/DependencyGraph/
// - Uses @visx/network (D3-backed) or react-force-graph-2d
// - Dagre layout pre-computed server-side for sprint graphs (cached in Redis)
// - Client renders with canvas (performance) for >50 nodes, SVG for ≤50 nodes
```

### API
```
GET /issues/:issueId/dependencies?depth=2   (returns nodes + edges within N hops)
GET /projects/:projectId/dependency-graph   (all project issue links)
GET /sprints/:sprintId/dependency-graph     (sprint-scoped)
POST /issues/:issueId/links                 (create a link, validates no cycle)
DELETE /issues/:issueId/links/:linkId
```

---

## Sprint Retrospective Board

A real-time collaborative retrospective board attached to each completed sprint.

### Data Model
```sql
retro_boards
  id         UUID PK
  sprint_id  UUID FK UNIQUE → sprints
  org_id     UUID FK
  status     TEXT    (open | voting | closed)
  created_at TIMESTAMPTZ

retro_cards
  id          UUID PK
  board_id    UUID FK → retro_boards
  org_id      UUID FK
  column      TEXT    (went_well | improve | action_item)
  body        TEXT
  author_id   UUID FK → users
  anonymous   BOOLEAN DEFAULT false
  vote_count  INTEGER DEFAULT 0
  linked_issue_id UUID nullable FK → issues  (for action items)
  created_at  TIMESTAMPTZ

retro_votes
  card_id    UUID FK
  user_id    UUID FK
  created_at TIMESTAMPTZ
  PRIMARY KEY (card_id, user_id)

retro_groups
  id         UUID PK
  board_id   UUID FK
  column     TEXT
  name       TEXT             (theme name, e.g., "Communication")
  card_ids   UUID[]           (cards grouped under this theme)
```

### Board UI (`/:orgSlug/:projectKey/sprints/:sprintId/retro`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Sprint 4 Retrospective  [Open]                    [End Retro]  │
│  5 participants online  ●●●●○                                    │
│                                                                  │
│  ┌──── 🟢 Went Well ────┐ ┌──── 🔴 To Improve ──┐ ┌── 💡 Actions ──┐ │
│  │                      │ │                     │ │                │ │
│  │ ┌──────────────────┐ │ │ ┌─────────────────┐ │ │ ┌────────────┐ │ │
│  │ │ Great team sync  │ │ │ │ PR reviews slow │ │ │ │ Daily      │ │ │
│  │ │ 👍 4  ···        │ │ │ │ 👍 6  ···       │ │ │ │ standups   │ │ │
│  │ └──────────────────┘ │ │ └─────────────────┘ │ │ │ → Create   │ │ │
│  │ ┌──────────────────┐ │ │                     │ │ │   Issue    │ │ │
│  │ │ Burndown on track│ │ │ + Add card          │ │ └────────────┘ │ │
│  │ │ 👍 2  ···        │ │ │                     │ │                │ │
│  │ └──────────────────┘ │ │                     │ │ + Add action   │ │
│  │                      │ │                     │ │                │ │
│  │ + Add card           │ │                     │ │                │ │
│  └──────────────────────┘ └─────────────────────┘ └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Features
- **Real-time**: cards added/edited/voted appear instantly for all participants (WebSocket room: `retro:{boardId}`).
- **Anonymous mode**: facilitator can toggle — cards show "Anonymous" instead of author name.
- **Voting phase**: facilitator switches to voting → each participant gets 5 votes to distribute across cards. Vote count revealed after all have voted (or timer expires).
- **Grouping**: drag cards to merge into a theme group. Group gets a name and a combined vote count.
- **Action items**: "Actions" column cards can be converted to real issues with one click → opens Issue Creation pre-filled with card text.
- **Timer**: built-in countdown timer (facilitator sets 5/10/15 min) for time-boxing writing phase.
- **Close retro**: locks board, sends `digest.sprint_report` email including retro summary.
- **History**: all past retros accessible at `/:orgSlug/:projectKey/sprints` → click sprint → "Retrospective" tab.

---

## Custom Roles (Enterprise)

Enterprise plan tenants can create bespoke roles beyond the built-in set.

### Data Model
```sql
custom_roles
  id           UUID PK
  org_id       UUID FK UNIQUE per name
  name         TEXT      -- e.g., "QA Engineer", "External Agency"
  description  TEXT
  permissions  TEXT[]    -- e.g., ['issues:read', 'issues:create', 'comments:create']
  is_default   BOOLEAN DEFAULT false  -- auto-assigned to new members
  created_by   UUID FK → users
  created_at   TIMESTAMPTZ
```

### Permission Granules
```
Platform: admin:all
Org:      org:read, org:update, org:delete, members:read, members:invite,
          members:remove, members:role_change, billing:read, billing:manage,
          audit_log:read, settings:update
Projects: projects:create, projects:archive, projects:settings
Issues:   issues:read, issues:create, issues:update_own, issues:update_any,
          issues:delete_own, issues:delete_any, issues:assign, issues:bulk_action
Sprints:  sprints:create, sprints:start, sprints:complete, sprints:delete
Docs:     docs:read, docs:create, docs:update, docs:delete
Comments: comments:create, comments:delete_own, comments:delete_any
Reports:  analytics:read, exports:create
```

### Role Builder UI (Org Settings → Roles)
```
┌─────────────────────────────────────────────────────────────┐
│  Roles              [+ New Role]                            │
│                                                             │
│  ● tenant_admin     (built-in)                             │
│  ● tenant_manager   (built-in)                             │
│  ● tenant_member    (built-in)                             │
│  ● QA Engineer      [Edit] [Delete]                        │
│  ● External Agency  [Edit] [Delete]                        │
└─────────────────────────────────────────────────────────────┘
```

Role editor: permission checklist grouped by category, with "Select all in group" toggles. Previews effective access as a human-readable summary: "Can read and create issues. Cannot manage members or billing."

### Integration with RBAC
- `org_members.role` field accepts both built-in enum values and custom role IDs.
- `can(user, action, resource)` utility checks custom role permissions array when built-in role lookup returns no match.
- RLS: custom roles map to `tenant_member` DB session variable (safe lower bound) — fine-grained permission checks happen at application layer only.

---

## Capacity Planning

Track team member availability per sprint and compare against committed story points.

### Data Model
```sql
sprint_capacity
  sprint_id       UUID FK
  user_id         UUID FK
  org_id          UUID FK
  available_hours NUMERIC     -- e.g., 40 (standard week) minus time off
  time_off_hours  NUMERIC DEFAULT 0
  notes           TEXT nullable  -- "Vacation Mon-Wed", "Conference Thursday"
  PRIMARY KEY (sprint_id, user_id)

-- organizations.default_sprint_hours: NUMERIC DEFAULT 40
-- users can override per sprint
```

### UI — Sprint Capacity Panel

Accessible from Sprint Creation Wizard (Step 3 already covers capacity bar). Also accessible from the active sprint board as a sidebar panel.

```
Sprint 4 Capacity
─────────────────────────────────────────
Member          Available  Assigned  Load
Sarah Chen      40h        32h       80% ██████████░░
John Smith      32h        40h      125% █████████████ ⚠
Maria Garcia    24h        16h       67% ████████░░░░
─────────────────────────────────────────
Team Total      96h        88h       92% ██████████████░
Story Points:   Committed: 34 / Capacity: ~40 pts

[Edit Availability]
```

- Load bar color: green (< 80%), yellow (80–100%), red (> 100%).
- "Edit Availability" opens a popover per member: set `available_hours` and `time_off_hours`.
- Hours-to-points conversion: configurable per org (`organizations.hours_per_point`, default 8).
- Capacity data used in Sprint Creation Wizard to populate the capacity bar.

### Team Availability Calendar
`/:orgSlug/calendar/availability` — dedicated view showing:
- Month grid.
- Each member's time-off blocks shown as colored bands.
- Sprint boundary bands overlaid.
- "Mark time off" button: creates a `sprint_capacity` time_off_hours entry for the selected member and sprint.


---

## File & Attachment Management

### Direct-to-S3 Upload Flow

Files are uploaded directly from the browser to S3, bypassing the API server. This avoids streaming large files through Node.js.

```
Browser                        API                         S3
  │                              │                           │
  │  POST /attachments/presign   │                           │
  │  { filename, mimeType, size }│                           │
  │─────────────────────────────▶│                           │
  │                              │  generatePresignedPutUrl  │
  │                              │──────────────────────────▶│
  │                              │◀──────────────────────────│
  │  { uploadUrl, s3Key, fields } │                           │
  │◀─────────────────────────────│                           │
  │                              │                           │
  │  PUT uploadUrl (direct)      │                           │
  │─────────────────────────────────────────────────────────▶│
  │◀─────────────────────────────────────────────────────────│
  │  200 OK                      │                           │
  │                              │                           │
  │  POST /attachments/confirm   │                           │
  │  { s3Key, issueId }          │                           │
  │─────────────────────────────▶│                           │
  │                              │  Record in DB             │
  │  { attachment }              │                           │
  │◀─────────────────────────────│                           │
```

Presigned URLs expire in 5 minutes. Max file size: 50MB. CORS configured on S3 bucket to allow PUT from `APP_URL`.

### Security Checks (Before Confirming)

On `POST /attachments/confirm`, before writing to DB:
1. **File type validation**: use `file-type` npm package to read magic bytes from S3 object header. Reject if MIME type doesn't match the declared type or is in the blocklist.
2. **Blocklist**: `.exe`, `.bat`, `.ps1`, `.sh`, `.dmg`, `.pkg`, `.msi`, `.jar`, `.vbs` — rejected immediately.
3. **Malware scan**: enqueue `virus-scan` BullMQ job → downloads file from S3 → runs ClamAV (or calls VirusTotal API) → if malware detected, deletes S3 object, marks attachment as `quarantined`, notifies uploader.
4. **Path traversal**: S3 key = `{orgId}/{issueId}/{uuid}.{ext}` — never uses user-supplied filename as key.
5. **Filename sanitization**: strip special characters from `filename` before storing in DB.

### Image Processing Pipeline

On image upload confirmation (JPEG, PNG, WebP, GIF):
- BullMQ `image-process` job:
  1. Download from S3.
  2. Generate thumbnails with `sharp`: 100×100 (card thumbnail), 400×300 (preview), 1200×900 (full, compressed).
  3. Convert to WebP.
  4. Upload variants back to S3: `{orgId}/thumbs/{uuid}-sm.webp`, `-md.webp`, `-lg.webp`.
  5. Update `attachments.thumbnails JSONB` with variant URLs.

### In-App File Preview

| File Type | Preview Component |
|-----------|------------------|
| Image (JPEG, PNG, WebP, GIF, SVG) | Lightbox (`yet-another-react-lightbox`) with zoom + swipe |
| PDF | `react-pdf` inline viewer (first 3 pages, "Open full" link) |
| Video (MP4, WebM) | `<video>` element with controls, poster = first-frame thumbnail |
| Audio | `<audio>` with waveform visualizer (`wavesurfer.js`) |
| Code (`.ts`, `.py`, `.json`, etc.) | Monaco editor (read-only, syntax highlighted) |
| Office (`.docx`, `.xlsx`, `.pptx`) | "Download to view" with file icon |
| Other | File icon + size + "Download" button |

All previews open in a `<Sheet>` (side drawer on desktop, bottom sheet on mobile).

### Storage Quota Tracking
```sql
-- Computed view, updated by trigger on attachment INSERT/DELETE
org_storage_usage
  org_id        UUID PK
  total_bytes   BIGINT
  file_count    INTEGER
  updated_at    TIMESTAMPTZ
```

- Quota enforced before presign: if `total_bytes + requested_size > plan_limit`, return 402.
- Usage meter shown in Org Settings → Billing.
- Cleanup job: purge S3 objects for soft-deleted attachments older than 30 days.

### Attachment Gallery (Issue Detail)
- Grid of thumbnails (images) or file-type icons (non-image).
- Hover: filename + size tooltip.
- Click: opens preview sheet.
- Drag to reorder.
- Delete with confirmation popover.
- "Upload" button triggers drag-and-drop zone or file picker.
- Drag files onto the issue detail page anywhere to upload.

### API
```
POST   /attachments/presign                (get S3 presign URL)
POST   /attachments/confirm               (record in DB after upload)
GET    /issues/:issueId/attachments
DELETE /attachments/:attachmentId
GET    /attachments/:attachmentId/download (presigned GET URL, 1h expiry)
```

---

## Push Notifications & PWA

### Progressive Web App (PWA)

```json
// apps/web/public/manifest.json
{
  "name": "ProjectManager",
  "short_name": "PM",
  "description": "Agile project management for startup teams",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0E1A",
  "theme_color": "#6366F1",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/board.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide" },
    { "src": "/screenshots/mobile.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" }
  ]
}
```

**Service Worker** (`apps/web/public/sw.js`) using **Workbox**:
- Cache strategy: `StaleWhileRevalidate` for API GET requests (serve cached, update in background).
- `NetworkFirst` for auth routes.
- `CacheFirst` for static assets (JS/CSS bundles — immutable with content hash).
- Offline fallback page: `/offline.html` — branded, shows last cached content where possible.
- Background sync: failed issue creates/updates queued in IndexedDB, replayed on reconnect.

### Web Push Notifications

**VAPID keys** generated once per environment, stored in env vars:
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@projectmanager.app
```

**Data Model:**
```sql
push_subscriptions
  id           UUID PK
  user_id      UUID FK
  org_id       UUID FK
  endpoint     TEXT
  p256dh       TEXT    (client public key)
  auth         TEXT    (client auth secret)
  user_agent   TEXT
  created_at   TIMESTAMPTZ
```

**Permission prompt strategy:**
- Never ask on page load.
- Show a subtle in-app prompt (notification bell popover) after user has:
  - Been in the app for >5 minutes AND
  - Has unread notifications.
- Prompt: "Get notified instantly when you're assigned an issue. [Enable Notifications] [Not now]"

**Push send flow:**
```ts
// In notification worker
import webpush from 'web-push';
webpush.setVapidDetails(subject, publicKey, privateKey);

const subscriptions = await db.getPushSubscriptions(userId);
await Promise.allSettled(
  subscriptions.map(sub =>
    webpush.sendNotification(sub, JSON.stringify({
      title: 'Issue assigned to you',
      body: '[ENG-42] Fix login redirect loop',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      data: { url: '/acme/ENG-42' },
      tag: 'issue-assigned',   // replaces previous notification with same tag
    }))
  )
);
```

**Notification types sent as push:** `issue_assigned`, `issue_mentioned`, `sprint_started`, `sprint_ending_soon`.

**Service worker handles click:** focus existing tab or open new tab to `data.url`.

---

## Product Analytics

Privacy-first usage analytics using **PostHog** (self-hostable, open-source).

### Setup
- Self-host PostHog on a separate server (or use PostHog Cloud).
- `POSTHOG_KEY` + `POSTHOG_HOST` env vars.
- Initialize in `apps/web/src/lib/analytics.ts`:
  ```ts
  import posthog from 'posthog-js';
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,        // manual control
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    autocapture: false,             // no accidental PII capture
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing(); // no analytics in dev
    },
  });
  ```
- Respect cookie consent: only initialize PostHog after analytics consent is granted.
- `posthog.identify(userId, { plan, orgId, role })` — called after login. Never include email or name.

### Events Tracked

```ts
// packages/shared/analytics/events.ts
export const AnalyticsEvents = {
  // Navigation
  PAGE_VIEWED:              'page_viewed',
  // Issues
  ISSUE_CREATED:            'issue_created',
  ISSUE_STATUS_CHANGED:     'issue_status_changed',
  ISSUE_BULK_ACTION:        'issue_bulk_action',
  ISSUE_TEMPLATE_USED:      'issue_template_used',
  // Board
  BOARD_CARD_DRAGGED:       'board_card_dragged',
  BOARD_FILTER_APPLIED:     'board_filter_applied',
  BOARD_VIEW_CHANGED:       'board_view_changed',       // kanban vs scrum
  // Sprints
  SPRINT_CREATED:           'sprint_created',
  SPRINT_STARTED:           'sprint_started',
  SPRINT_COMPLETED:         'sprint_completed',
  // Roadmap
  ROADMAP_VIEWED:           'roadmap_viewed',
  ROADMAP_ZOOMED:           'roadmap_zoomed',
  GANTT_ITEM_RESCHEDULED:   'gantt_item_rescheduled',
  // Docs
  DOC_CREATED:              'doc_created',
  DOC_BLOCK_ADDED:          'doc_block_added',
  // Search
  SEARCH_PERFORMED:         'search_performed',
  SEARCH_RESULT_CLICKED:    'search_result_clicked',
  // Collaboration
  COMMENT_ADDED:            'comment_added',
  MENTION_USED:             'mention_used',
  // Billing
  UPGRADE_CLICKED:          'upgrade_clicked',
  UPGRADE_COMPLETED:        'upgrade_completed',
  TRIAL_STARTED:            'trial_started',
  // Onboarding
  ONBOARDING_STEP_COMPLETED:'onboarding_step_completed',
  ONBOARDING_COMPLETED:     'onboarding_completed',
  PRODUCT_TOUR_STARTED:     'product_tour_started',
  PRODUCT_TOUR_COMPLETED:   'product_tour_completed',
  PRODUCT_TOUR_DISMISSED:   'product_tour_dismissed',
};
```

All events include: `orgId` (hashed), `plan`, `role`. Never include `email`, `name`, `userId` (use PostHog's anonymous ID + identified group).

### Feature Adoption Funnels (PostHog Funnels)
- **Activation funnel**: Signup → Create Project → Create Issue → Move Issue to Done (3-day window)
- **Retention**: DAU/WAU/MAU per plan cohort
- **Sprint adoption**: % of orgs that created a sprint within 7 days of first project
- **Upgrade funnel**: Upgrade Clicked → Checkout Started → Upgrade Completed

### A/B Testing (PostHog Feature Flags + Experiments)
- Tied to the feature flag system — PostHog flags override DB flags for experiment variants.
- Example: test two onboarding wizard flows (4-step vs 2-step).
- `useFeatureFlag('onboarding_v2')` returns `true` for experiment group.
- Results analyzed in PostHog Experiments dashboard (conversion rate per variant).

### Session Recording
- Opt-in: enabled for pro/enterprise plan users only.
- `posthog.startSessionRecording()` called for eligible users after consent.
- PII masking: all `<input type="password">` and `<input data-sensitive>` elements masked automatically by PostHog.
- Session recordings accessible to `platform_admin` in PostHog UI.


---

## Slack / Discord / Teams Integrations

### Slack Integration

**Setup:** OAuth 2.0 app installation (covered in GitHub Integration Wizard — same pattern, Slack variant).

**Scopes:** `chat:write`, `channels:read`, `commands`, `incoming-webhook`.

**Data Model:**
```sql
slack_integrations
  id               UUID PK
  org_id           UUID FK
  project_id       UUID nullable FK  (null = org-level)
  slack_team_id    TEXT
  slack_channel_id TEXT
  channel_name     TEXT
  access_token     TEXT (encrypted)
  bot_user_id      TEXT
  notify_on        TEXT[]   -- ['issue.created', 'sprint.started', 'sprint.completed', 'issue.assigned']
  created_by       UUID FK → users
  created_at       TIMESTAMPTZ
```

**Notifications posted to Slack:**
```
[ENG-42] Fix login redirect loop
Status: In Progress → Done  ·  Assigned: Sarah Chen
[View Issue →]
```
All messages use Slack Block Kit for rich formatting: issue key as monospace, priority emoji, status color, CTA button.

**Slash Command** (`/pm`):
- `/pm ENG-42` → returns issue summary card in the channel (ephemeral).
- `/pm create Fix login bug` → opens Slack modal to create a new issue (org + project picker).
- `/pm sprint` → shows active sprint status (issues complete/total, % burndown).

**Event subscriptions** (Slack sends to `POST /webhooks/slack/events`):
- `app_mention` in a channel: respond with issue lookup if message contains an issue key pattern.

---

### Discord Integration

Simpler than Slack — webhook-based, no OAuth required.

**Data Model:**
```sql
discord_integrations
  id               UUID PK
  project_id       UUID FK
  org_id           UUID FK
  webhook_url      TEXT (encrypted)
  notify_on        TEXT[]
  created_at       TIMESTAMPTZ
```

**Notifications:** HTTP POST to Discord webhook with an **embed**:
```json
{
  "embeds": [{
    "title": "[ENG-42] Fix login redirect loop",
    "url": "https://app.example.com/acme/ENG-42",
    "color": 5763719,
    "fields": [
      { "name": "Status",   "value": "In Progress → Done", "inline": true },
      { "name": "Priority", "value": "🔴 Urgent",          "inline": true },
      { "name": "Assignee", "value": "Sarah Chen",          "inline": true }
    ],
    "timestamp": "2026-05-25T10:00:00Z"
  }]
}
```

Setup: Project Settings → Integrations → Discord → paste webhook URL → select events → save.

---

### Microsoft Teams Integration

Webhook-based (Teams Incoming Webhooks or Power Automate connector).

**Data Model:** Same as `discord_integrations` table pattern.

**Notification format:** Teams Adaptive Card:
```json
{
  "type": "AdaptiveCard",
  "body": [
    { "type": "TextBlock", "text": "[ENG-42] Fix login redirect loop", "weight": "bolder" },
    { "type": "FactSet", "facts": [
      { "title": "Status",   "value": "Done" },
      { "title": "Priority", "value": "Urgent" },
      { "title": "Assignee", "value": "Sarah Chen" }
    ]},
    { "type": "ActionSet", "actions": [
      { "type": "Action.OpenUrl", "title": "View Issue", "url": "..." }
    ]}
  ]
}
```

---

### Integration Settings UI

**Project Settings → Integrations:**
```
Integrations
─────────────────────────────────────────────────
[Slack Logo]    Slack
                Connected to #engineering
                Events: issue created, sprint complete
                [Configure]  [Disconnect]

[Discord Logo]  Discord
                Not connected
                [Connect]

[Teams Logo]    Microsoft Teams
                Not connected
                [Connect]

[GitHub Logo]   GitHub
                Connected to acme-corp/backend
                [Configure]  [Disconnect]

[GitLab Logo]   GitLab
                Not connected
                [Connect]

[Webhooks Icon] Custom Webhooks
                3 active webhooks
                [Manage Webhooks]
```

---

## API SDK

A typed TypeScript/JavaScript SDK published as `@projectmanager/sdk`.

### Structure
```
packages/sdk/
  src/
    client.ts          ← main SDK class
    resources/
      auth.ts
      issues.ts
      projects.ts
      sprints.ts
      orgs.ts
      search.ts
    types/             ← auto-generated from openapi.yaml
    utils/
      pagination.ts    ← cursor-based pagination helper
      retry.ts         ← automatic retry with exp backoff
    index.ts
  README.md
  package.json         ← published as @projectmanager/sdk
```

### Usage Example
```ts
import { ProjectManagerClient } from '@projectmanager/sdk';

const pm = new ProjectManagerClient({
  apiKey: 'pm_live_...',           // or bearer token
  baseUrl: 'https://api.projectmanager.app',
});

// List issues with auto-pagination
for await (const issue of pm.issues.list({ projectId: 'proj_123', priority: 'urgent' })) {
  console.log(issue.issueKey, issue.title);
}

// Create an issue
const issue = await pm.issues.create({
  projectId: 'proj_123',
  title: 'Fix login redirect',
  type: 'bug',
  priority: 'high',
  assigneeId: 'usr_456',
});

// Update status
await pm.issues.update(issue.id, { statusId: 'status_done' });
```

### Generation
Types auto-generated from `docs/api/openapi.yaml` using `openapi-typescript`:
```bash
pnpm --filter @pm/sdk generate  # reads openapi.yaml → generates src/types/
```

Run in CI on every API schema change.

---

## API Versioning & Deprecation Policy

### Versioning Strategy
- Current version: `/api/v1/`.
- New major version (`/api/v2/`) introduced only for breaking changes.
- Both versions run simultaneously during transition period.
- Version negotiation: client can also set `Accept: application/vnd.pm.v2+json` header as alternative.

### Deprecation Process
1. Mark endpoint as deprecated in OpenAPI spec: `deprecated: true`.
2. Add response headers to deprecated endpoints:
   ```
   Deprecation: true
   Sunset: Sat, 25 May 2027 00:00:00 GMT
   Link: <https://docs.projectmanager.app/api/migration/v1-to-v2>; rel="deprecation"
   ```
3. Log a `warn` on every call to deprecated endpoints (includes `userId`, `orgId`, correlation ID).
4. Email API key owners 90 days, 30 days, and 7 days before Sunset date.
5. After Sunset: endpoint returns `410 Gone` with migration guide URL in body.

### Minimum Support Window
- Every endpoint supported for **12 months** after deprecation notice.
- Breaking changes (field removal, type change, endpoint removal) require a new major version.
- Non-breaking additions (new optional fields, new endpoints) shipped without version bump.

### API Changelog
`docs/api/CHANGELOG.md` — human-readable log of all API changes:
```markdown
## v1.12.0 — 2026-05-25
### Added
- `GET /issues/:id/dependencies` — issue dependency graph endpoint
- `custom_fields` array on Issue response

## v1.11.0 — 2026-04-10
### Deprecated
- `GET /issues/:id/links` — use `GET /issues/:id/dependencies` instead (sunset: 2027-04-10)
```

---

## Database Table Partitioning

High-volume append-only tables partitioned by time to maintain query performance at scale.

### Tables to Partition

```sql
-- audit_logs: range partition by created_at (monthly)
CREATE TABLE audit_logs (
  id          UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL,
  ...
) PARTITION BY RANGE (created_at);

-- Auto-create monthly partitions using pg_partman
SELECT partman.create_parent(
  p_parent_table => 'public.audit_logs',
  p_control      => 'created_at',
  p_type         => 'range',
  p_interval     => 'monthly',
  p_premake      => 3          -- pre-create 3 future months
);
```

Apply same pattern to: `email_logs`, `activity_logs`, `notifications`, `search_queries`.

### Maintenance
- `pg_partman` background worker runs nightly: creates future partitions, detaches old ones.
- Old partitions (> retention limit) moved to cold storage S3 via `pg_dump` then dropped.
- Partition pruning: queries with `WHERE created_at BETWEEN ...` automatically skip irrelevant partitions.

### Migration Strategy
Existing tables migrated to partitioned tables using the `pg_partman` swap technique:
1. Create new partitioned table alongside existing table.
2. Backfill data in batches (avoid locking).
3. Create trigger on old table to dual-write to new table during migration.
4. Swap table names atomically.
5. Drop old table + trigger.

---

## Content Security Policy (CSP)

### Full CSP Header Spec

```
Content-Security-Policy:
  default-src 'self';
  script-src  'self' 'nonce-{REQUEST_NONCE}';
  style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src    'self' https://fonts.gstatic.com;
  img-src     'self' data: blob: https://*.amazonaws.com https://*.cloudfront.net;
  connect-src 'self' wss://app.example.com https://api.example.com
              https://*.sentry.io https://app.posthog.com;
  frame-src   'none';
  object-src  'none';
  base-uri    'self';
  form-action 'self';
  upgrade-insecure-requests;
  report-uri  /csp-report;
  report-to   csp-endpoint;
```

### Nonce Generation
Fastify generates a cryptographic nonce per request:
```ts
fastify.addHook('onRequest', async (req, reply) => {
  const nonce = randomBytes(16).toString('base64');
  req.cspNonce = nonce;
  reply.header('Content-Security-Policy',
    CSP_TEMPLATE.replace(/{REQUEST_NONCE}/g, nonce));
});
```

Nonce injected into HTML via Vite SSR or a `<meta name="csp-nonce">` tag read by the React app for dynamically injected scripts.

### CSP Violation Reporting
```
POST /csp-report
Content-Type: application/csp-report

{
  "csp-report": {
    "blocked-uri": "https://evil.com/tracker.js",
    "violated-directive": "script-src",
    "source-file": "https://app.example.com",
    ...
  }
}
```

Violations logged to Pino and forwarded to Sentry with `level: warn`. Platform admin can view violation log in `/admin/security`.

### Report-Only Mode First
Deploy `Content-Security-Policy-Report-Only` header first. Monitor violations for 2 weeks. Once false positives are resolved, switch to enforcing `Content-Security-Policy`.

---

## White-labeling & Custom App Domain (Enterprise)

Enterprise tenants can map their own domain to their workspace.

### Setup Wizard (3 steps — added to Wizards section)
```
Step 1 — Enter Domain
  Fields: Custom domain (e.g., pm.acme.com)
  Note: "Your team will access the app at https://pm.acme.com"

Step 2 — Configure DNS
  Show DNS records to add:
  ┌──────┬──────────────────┬──────────────────────────────────┐
  │ Type │ Name             │ Value                            │
  ├──────┼──────────────────┼──────────────────────────────────┤
  │ CNAME│ pm.acme.com      │ custom.projectmanager.app        │
  └──────┴──────────────────┴──────────────────────────────────┘
  [Copy Record]  [Check DNS ↻]  — polls every 30s, shows ✓ when propagated

Step 3 — SSL Certificate
  "We'll automatically provision a Let's Encrypt certificate."
  Status: Provisioning... → ✅ Certificate issued (auto, via cert-manager or Caddy)
```

### Data Model
```sql
-- Add to organizations table:
  custom_domain        TEXT nullable UNIQUE
  custom_domain_status TEXT nullable  (pending | active | failed)
  custom_domain_verified_at TIMESTAMPTZ nullable
```

### Behaviour When Active
- `https://pm.acme.com` resolves to the app, scoped to that org's workspace automatically (no slug in URL).
- "Powered by ProjectManager" footer removed.
- Email `from` domain uses the org's custom email domain (if configured).
- Auth: OAuth callbacks updated to use the custom domain.
- If custom domain goes dark: fallback redirect to `app.projectmanager.app/acme`.

---

## Onboarding Email Drip Sequence

Automated email nurture sequence for new org admins. All emails suppressed if the user has been active (logged in) within the last 24 hours before the send.

### Sequence Definition

```ts
// packages/shared/email/drips.ts
export const ONBOARDING_DRIP: DripEmail[] = [
  {
    day: 0,
    templateKey: 'onboarding.welcome',
    condition: () => true,                                    // always send
  },
  {
    day: 1,
    templateKey: 'onboarding.create_sprint',
    condition: (org) => org.sprintCount === 0,               // only if no sprint yet
  },
  {
    day: 3,
    templateKey: 'onboarding.invite_team',
    condition: (org) => org.memberCount < 2,                 // only if flying solo
  },
  {
    day: 5,
    templateKey: 'onboarding.explore_roadmap',
    condition: (org) => org.epicCount === 0,                 // no epics created
  },
  {
    day: 7,
    templateKey: 'onboarding.power_features',
    condition: () => true,
  },
  {
    day: 10,
    templateKey: 'onboarding.automation_tip',
    condition: (org) => org.automationCount === 0,
  },
  {
    day: 14,
    templateKey: 'billing.trial_ending',                     // only if on trial
    condition: (org) => org.plan === 'trial',
  },
];
```

### Data Model
```sql
drip_email_logs
  user_id       UUID FK
  org_id        UUID FK
  template_key  TEXT
  sent_at       TIMESTAMPTZ
  skipped       BOOLEAN     (true if condition not met or user was active)
  PRIMARY KEY (user_id, org_id, template_key)
```

### BullMQ Schedule
- Daily cron job (`drip` queue): runs at 09:00 UTC.
- For each org: find users who signed up `N` days ago (where N matches a drip day).
- Check condition, check last login, check drip_email_logs (no duplicate sends).
- Queue email job if all checks pass.

### Email Content (Summaries)
| Template | Subject | Content |
|----------|---------|---------|
| `onboarding.welcome` | Welcome to ProjectManager 👋 | Tour of key features, quick-start CTA |
| `onboarding.create_sprint` | Ready to run your first sprint? | 3-step guide to starting a sprint |
| `onboarding.invite_team` | Better together — invite your team | Benefits of collaboration, invite link |
| `onboarding.explore_roadmap` | Plan ahead with the Roadmap view | Roadmap feature highlight, screenshot |
| `onboarding.power_features` | You've got the basics — now level up | Automations, custom fields, docs highlight |
| `onboarding.automation_tip` | Let automations do the busywork | Example automation: auto-close on PR merge |


---

## Report Builder

Users can create, save, and schedule custom reports from any data in their workspace.

### Report Types (Pre-built)

| Report | Description |
|--------|-------------|
| Sprint Report | Issues completed, velocity, burndown, cycle time for a sprint |
| Team Velocity | Story points completed per sprint (bar chart, rolling avg) |
| Issue Aging | How long issues have been in each status |
| Cycle Time | Time from "In Progress" to "Done" per issue type and member |
| Member Activity | Issues created, closed, commented per team member |
| Epic Progress | % complete per epic with projected finish dates |
| Overdue Issues | All issues past due date grouped by project and assignee |
| Custom | User-defined: pick metrics, dimensions, filters |

### Custom Report Builder UI (`/:orgSlug/reports/new`)

```
┌───────────────────────────────────────────────────────────────┐
│  Report Builder                          [Preview] [Save]     │
│                                                               │
│  Name: [Untitled Report               ]                       │
│                                                               │
│  ┌── Data Source ──────────────────────────────────────────┐  │
│  │  ● Issues  ○ Sprints  ○ Members  ○ Time Logs           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌── Filters ──────────────────────────────────────────────┐  │
│  │  + Add Filter                                           │  │
│  │  [Project ▾] [is] [Engineering ▾]          [✕]        │  │
│  │  [Priority ▾] [is any of] [Urgent, High ▾] [✕]        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌── Group By ─────────────────────────────────────────────┐  │
│  │  [Status ▾]   then   [Assignee ▾]                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌── Metrics ──────────────────────────────────────────────┐  │
│  │  ☑ Count   ☑ Story Points   ☐ Cycle Time   ☐ Hours     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌── Visualization ────────────────────────────────────────┐  │
│  │  [Bar Chart ▾]   Date range: [Last 30 days ▾]          │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

Live preview re-renders on every filter/group change (debounced 800ms API call).

### Saved Reports

```sql
saved_reports
  id           UUID PK
  org_id       UUID FK
  project_id   UUID nullable FK
  name         TEXT
  config       JSONB    -- { dataSource, filters, groupBy, metrics, visualization, dateRange }
  created_by   UUID FK → users
  shared       BOOLEAN DEFAULT false
  share_token  TEXT nullable UNIQUE  -- for public sharing
  created_at   TIMESTAMPTZ
  updated_at   TIMESTAMPTZ

report_schedules
  id           UUID PK
  report_id    UUID FK
  recipients   TEXT[]    -- email addresses (must be org members)
  frequency    TEXT      -- weekly | monthly
  send_at_day  INTEGER   -- 0-6
  send_at_hour INTEGER
  format       TEXT      -- pdf | csv | excel
  active       BOOLEAN DEFAULT true
  last_sent_at TIMESTAMPTZ nullable
  next_send_at TIMESTAMPTZ
```

### Features
- **Save report**: named, visible in sidebar under "Reports".
- **Shareable link**: toggle "Share" → generates a `share_token`. Anyone with the link can view (read-only, no auth required — data scoped to org's public-safe fields).
- **Schedule delivery**: set frequency, recipients (from org members), format. BullMQ `reports` queue renders and emails on schedule.
- **Export**: "Export" button → queues BullMQ `exports` job → returns download link:
  - CSV: flat data export
  - Excel (`.xlsx`): via `exceljs` — multiple sheets for grouped data
  - PDF: headless browser (Playwright) renders the report page → saves as PDF

### API
```
GET    /orgs/:orgId/reports
POST   /orgs/:orgId/reports
GET    /reports/:reportId
PATCH  /reports/:reportId
DELETE /reports/:reportId
POST   /reports/:reportId/run           (execute and return data)
POST   /reports/:reportId/export        (queue export job, return jobId)
GET    /reports/:reportId/share-link    (generate or return share token)
GET    /reports/shared/:shareToken      (public, no auth)
POST   /reports/:reportId/schedule
PATCH  /reports/:reportId/schedule
DELETE /reports/:reportId/schedule
```

---

## Full Accessibility Spec (WCAG 2.1 AA)

### Color Contrast Ratios

All text must meet WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text (>18pt or >14pt bold).

**Dark mode palette contrast checks:**

| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|-----------|-------|------|
| Body text | `#E2E8F0` | `#0F1629` | 11.2:1 | ✅ |
| Muted text | `#64748B` | `#0F1629` | 4.8:1 | ✅ |
| Primary button | `#FFFFFF` | `#6366F1` | 4.7:1 | ✅ |
| Danger button | `#FFFFFF` | `#F43F5E` | 4.5:1 | ✅ |
| Active nav item | `#E2E8F0` | `#1A2237` | 9.1:1 | ✅ |
| Input placeholder | `#64748B` | `#141B2D` | 4.6:1 | ✅ |
| Badge text (urgent) | `#FEE2E2` | `#BE123C` | 4.6:1 | ✅ |

All contrast ratios verified with `@accessible/color` in a test (`packages/ui/src/__tests__/contrast.test.ts`).

### Focus Management

- All interactive elements have a visible focus ring: `outline: 2px solid #6366F1; outline-offset: 2px`.
- Browser default outlines removed (`outline: none`) only when replaced with custom focus ring.
- Focus trapped inside modals, sheets, and dialogs (using `focus-trap-react`).
- After modal close: focus returns to the trigger element.
- After navigation: focus moves to the page `<h1>` (via `useEffect` on route change).

### Keyboard Navigation Map

| Context | Key | Action |
|---------|-----|--------|
| Global | `Cmd/Ctrl+K` | Open command palette |
| Global | `C` | Create new issue (when not in input) |
| Global | `Escape` | Close modal/sheet/palette |
| Board | `→` / `←` | Move focus between columns |
| Board | `↑` / `↓` | Move focus between cards in a column |
| Board | `Enter` | Open focused card |
| Board | `Space` | Select card for multi-select |
| Backlog | `Space` | Check/uncheck issue row |
| Issue detail | `E` | Edit title |
| Issue detail | `A` | Open assignee picker |
| Issue detail | `P` | Open priority picker |
| Issue detail | `S` | Open status picker |
| Issue detail | `L` | Open label picker |
| Issue detail | `D` | Set due date |
| Command palette | `↑` / `↓` | Navigate results |
| Command palette | `Enter` | Execute focused result |
| Command palette | `Tab` | Switch result category |

### ARIA Annotations

- **Board columns**: `role="list"` on column, `role="listitem"` on each card.
- **Drag and drop**: `aria-grabbed`, `aria-dropeffect` on draggable cards; `aria-live="polite"` region announces drag result.
- **Modals**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to modal title.
- **Loading states**: `aria-busy="true"` on container while loading; screen reader announcement on load complete via `aria-live="polite"`.
- **Toast notifications**: rendered in an `aria-live="polite"` region (errors: `aria-live="assertive"`).
- **Progress bars**: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- **Icons without text labels**: `aria-label` or `aria-hidden="true"` + visually hidden sibling text.
- **Form errors**: `aria-describedby` links input to error message element. `aria-invalid="true"` on invalid inputs.
- **Tabs**: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, keyboard arrow navigation.
- **Command palette**: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Framer Motion: wrap all `motion.*` components with `useReducedMotion()` hook — return instant transitions when `true`.

### Screen Reader Testing Checklist
Manual testing required with:
- **NVDA** + Chrome (Windows)
- **VoiceOver** + Safari (macOS / iOS)
- **TalkBack** + Chrome (Android)

Checklist per page:
- [ ] Page title announced on navigation
- [ ] All images have meaningful alt text or are decorative (`alt=""`)
- [ ] Form labels associated with inputs
- [ ] Error messages announced when form submitted
- [ ] Dynamic content changes announced (issues moved, notifications added)
- [ ] Custom components (board, gantt, command palette) fully operable

### Accessibility CI
- `axe-playwright` runs against all E2E test pages — zero violations required for PR merge.
- `jest-axe` in component unit tests for all `packages/ui` components.
- Manual accessibility review required before each major release.




---

## Final Deliverable Checklist

The generated codebase must satisfy every item below before it is considered complete.

### Architecture
- [ ] Monorepo with Turborepo pipeline (all packages independently buildable)
- [ ] `pnpm` workspaces with exact version pins
- [ ] Shared `packages/config` consumed by all apps
- [ ] End-to-end TypeScript strict mode (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- [ ] Zod schemas in `packages/shared` used for both API validation and frontend types
- [ ] No circular package dependencies

### Security
- [ ] JWT RS256 with JWKS endpoint (multi-key for rotation)
- [ ] Refresh token family invalidation implemented
- [ ] All 3 tenant isolation layers active (app layer + ORM middleware + RLS)
- [ ] RLS policies on every tenant-owned table
- [ ] CSP header with per-request nonce
- [ ] CORS allowlist (no wildcards)
- [ ] All file uploads scanned for malware before accessible
- [ ] No secrets in code or logs (Pino redaction configured)
- [ ] `gitleaks` pre-commit hook active

### Database
- [ ] All migrations use Prisma Migrate (no manual SQL patches)
- [ ] RLS SQL files committed alongside migrations
- [ ] DB partitioning on high-volume tables
- [ ] Indexes for all FK columns + full-text search columns
- [ ] Seed script produces a fully usable demo workspace

### Testing
- [ ] Unit test coverage ≥ 80% (lines, functions, branches)
- [ ] Integration tests cover all API routes with RBAC assertions
- [ ] E2E tests cover all critical journeys (Table in Testing section)
- [ ] axe-core passes on all major pages (zero violations)
- [ ] Lighthouse CI score ≥ 80 (performance, accessibility, best practices)
- [ ] k6 load tests pass thresholds (p95 < 200ms, error rate < 1%)

### Documentation
- [ ] `docs/user/` — all 10 user guides written
- [ ] `docs/developer/getting-started.md` — new dev can clone + run in < 15 min
- [ ] `docs/api/openapi.yaml` — complete, generated, committed
- [ ] `docs/security/` — all 6 security docs written
- [ ] `docs/database/schema.md` — Mermaid ERD committed
- [ ] `docs/ops/runbooks.md` — all runbooks written
- [ ] Every app and package has its own `README.md`

### Observability
- [ ] Every log line is JSON with `correlationId`, `userId`, `orgId`
- [ ] Audit log captures all events in the catalog
- [ ] `/health` and `/health/ready` return correct status codes
- [ ] `/metrics` exposes all Prometheus metrics listed
- [ ] Sentry captures errors with user context + source maps
- [ ] BullMQ Bull Board accessible to `platform_admin`

### UI & UX
- [ ] Full dark mode (all pages, all components)
- [ ] All 15 wizards implemented and beautiful
- [ ] All 10 empty states implemented with illustrations
- [ ] Onboarding checklist + 2 product tours
- [ ] All 5 error pages designed and implemented
- [ ] Mobile-responsive at 375px without horizontal scroll
- [ ] Bottom nav on mobile (5 tabs)
- [ ] All modals → bottom sheets on mobile
- [ ] `prefers-reduced-motion` disables all animations
- [ ] All 44+ keyboard shortcuts working

# Database Schema

## Domain Models

### `users`

Represents a platform-level user account. One user can belong to multiple organisations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `email` | text | Unique, used for login |
| `password_hash` | text | bcrypt, cost 12 |
| `full_name` | text | Display name |
| `avatar_url` | text? | S3 URL |
| `platform_role` | enum? | `platform_admin` or `platform_support`; null for normal users |
| `mfa_secret` | text? | TOTP secret (encrypted) |
| `email_verified_at` | timestamptz? | Null until email verified |
| `last_login_at` | timestamptz? | Updated on each login |
| `cookie_consent` | text? | GDPR consent state |

### `sessions`

Tracks active login sessions. Used for refresh token rotation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Session ID; embedded in JWT `sessionId` claim |
| `user_id` | uuid | FK → users |
| `refresh_token_hash` | text | bcrypt hash of the one-time refresh token |
| `token_family` | uuid | Groups related sessions for theft detection |
| `device_info` | text? | User-Agent string |
| `ip_address` | text? | Client IP at login time |
| `expires_at` | timestamptz | 7 days from creation |
| `revoked_at` | timestamptz? | Set on logout, token rotation, or theft detection |

### `organizations`

A tenant. One organisation per subscription.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `name` | text | Display name |
| `slug` | text | Unique URL-safe identifier |
| `logo_url` | text? | |
| `plan` | enum | `free`, `pro`, `enterprise` |
| `suspended_at` | timestamptz? | Set by platform admin; blocks all API access |

### `org_members`

Many-to-many join between users and organisations. Composite PK `(org_id, user_id)`.

| Column | Type | Notes |
|--------|------|-------|
| `org_id` | uuid | |
| `user_id` | uuid | |
| `role` | enum | `tenant_admin` / `tenant_manager` / `tenant_member` / `tenant_viewer` / `tenant_guest` |
| `invited_by` | uuid? | User who sent the invite |
| `joined_at` | timestamptz | |

### `projects`

A project belongs to one org and has its own board, backlog, sprints, and epics.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `org_id` | uuid | |
| `name` | text | |
| `identifier` | text | Short uppercase key like `ENG`; prefix for issue keys |
| `type` | enum | `scrum` or `kanban` |
| `color` | text | Hex colour for UI |
| `status` | enum | `active` or `archived` |
| `default_assignee_id` | uuid? | Auto-assign new issues to this user |

Unique constraint: `(org_id, identifier)` — no two projects in the same org can share a prefix.

### `project_statuses`

Custom workflow statuses per project. Each status maps to a `StatusCategory` for burndown and board grouping.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `project_id` | uuid | |
| `name` | text | e.g., "In Review" |
| `color` | text | Hex |
| `category` | enum | `backlog`, `todo`, `in_progress`, `done`, `canceled` |
| `position` | int | Display order |

### `issues`

The central model. Issues are soft-deleted (`deleted_at`) rather than hard-deleted.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `org_id` | uuid | Denormalised for RLS performance |
| `project_id` | uuid | |
| `issue_key` | text | e.g., `ENG-42`. Denormalised; unique within org |
| `title` | text | |
| `description` | jsonb? | ProseMirror document format |
| `type` | enum | `epic`, `story`, `task`, `bug`, `subtask` |
| `status_id` | uuid? | FK → project_statuses |
| `priority` | enum | `urgent`, `high`, `medium`, `low`, `none` |
| `assignee_id` | uuid? | |
| `reporter_id` | uuid | |
| `parent_id` | uuid? | FK → issues (self-referential for subtasks) |
| `sprint_id` | uuid? | Current sprint |
| `milestone_id` | uuid? | |
| `epic_id` | uuid? | |
| `estimate` | float? | Story points |
| `due_date` | timestamptz? | |
| `rank` | float | Midpoint rank for drag-and-drop ordering; see performance.md |
| `deleted_at` | timestamptz? | Soft delete; RLS and service layer filter this out |

Unique constraint: `(org_id, issue_key)`.

### `sprints`

Time-boxed iterations for Scrum projects.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `project_id` | uuid | |
| `org_id` | uuid | Denormalised |
| `name` | text | e.g., "Sprint 12" |
| `goal` | text? | Sprint goal description |
| `start_date` | timestamptz? | |
| `end_date` | timestamptz? | |
| `status` | enum | `planned`, `active`, `completed` |
| `completed_at` | timestamptz? | Set by sprint completion wizard |

### `epics`

Large bodies of work that span multiple sprints.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `project_id` | uuid | |
| `org_id` | uuid | |
| `title` | text | |
| `color` | text | Roadmap visualisation colour |
| `status` | text | `open`, `in_progress`, `done` |
| `start_date` | timestamptz? | Used in Gantt/roadmap view |
| `end_date` | timestamptz? | |

### `comments`

Threaded comments on issues. Stored as ProseMirror JSON (same format as issue descriptions).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `issue_id` | uuid | |
| `org_id` | uuid | Denormalised |
| `author_id` | uuid | |
| `body` | jsonb | ProseMirror document |
| `parent_id` | uuid? | For threaded replies |
| `deleted_at` | timestamptz? | Soft delete |

### `audit_logs`

Append-only event log. See `security/logging-audit.md` for the full event list.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | |
| `org_id` | uuid? | Null for platform-level events |
| `actor_id` | uuid? | |
| `actor_role` | text? | |
| `action` | text | Dotted event name: `issue.deleted` |
| `resource_type` | text | |
| `resource_id` | uuid? | |
| `metadata` | jsonb? | Event-specific payload |
| `ip_address` | text? | |
| `user_agent` | text? | |

RLS policy prevents all deletes. See `database/rls-policies.md`.

### Other Tables

| Table | Purpose |
|-------|---------|
| `labels` | Org-scoped or project-scoped colour labels |
| `milestones` | Project milestones with due dates |
| `attachments` | File attachments; `s3_key` stores the object key |
| `time_logs` | Manual time tracking per issue |
| `api_keys` | Personal API keys; `key_hash` is pgcrypto SHA-256 |
| `subscriptions` | Stripe subscription state per org |
| `invoices` | Stripe invoice history |
| `notifications` | In-app notification feed per user |
| `issue_links` | `blocks`/`is blocked by` relationships between issues |
| `docs` | Wiki-style project documentation (tree structure via `parent_id`) |
| `doc_comments` | Inline comments on doc blocks |
| `issue_templates` | Reusable issue creation templates |
| `automation_rules` | If-this-then-that automation rules |
| `automation_run_logs` | Execution history for automation rules |
| `feature_flags` | Platform-wide feature flags |
| `feature_flag_overrides` | Per-org flag overrides |

## Relationship Diagram

```
users ──────────────────────── org_members ────── organizations
  │                                                     │
  │ reporter/assignee                              projects
  └──────────────────── issues ──────────────────────┘
                          │         │
                     comments    sprints
                          │         │
                      time_logs  epic_issues
                          │
                      attachments

organizations ─── subscriptions ─── invoices
organizations ─── audit_logs
organizations ─── notifications ─── users
projects ──────── docs ────────── doc_comments
```

## Key Design Decisions

### Soft Deletes

Issues, comments, and docs use `deleted_at` instead of hard deletes. This allows:
- Undo actions within a short window
- Audit trail preservation
- GDPR: soft-deleted records are included in data exports but scheduled for hard deletion by the `cleanup` queue after 30 days

All queries filter `deleted_at IS NULL` by default (enforced in the service layer).

### `rank` Float for Ordering

Issue ordering on the board and backlog uses a `float` column rather than integer positions. Moving an issue between two others sets its rank to `(above.rank + below.rank) / 2`. This avoids reindexing the entire column on every move.

When ranks become too close (differ by less than `1e-10`), the service rebalances the affected contiguous range back to integer spacing. See `database/performance.md` for details.

### JSONB for Rich Content

Issue descriptions and comment bodies are stored as ProseMirror JSON documents in `jsonb` columns. This allows:
- Structure-aware search (GIN index on text nodes)
- Lossless round-trip through the API without parsing
- Future schema evolution without migrations

### Denormalised `issue_key`

`issue_key` (e.g., `ENG-42`) is denormalised into the `issues` table even though it could be derived from `project.identifier + auto-increment`. This avoids a join on every issue list query and makes the key stable even if the project identifier changes.

The key is generated in the service layer by incrementing a counter stored in the project row, then set at insert time.

### Denormalised `org_id` on Child Tables

`org_id` is included on `issues`, `sprints`, `epics`, `comments`, `docs`, and `notifications` even though it can be reached through the parent. This is required for RLS policies to work efficiently — PostgreSQL evaluates `USING` clauses before joins, so the org check must be on the same row.

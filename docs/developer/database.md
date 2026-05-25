# Database

## Stack

- **Database**: PostgreSQL 16
- **ORM**: Prisma 5
- **Connection pooling**: PgBouncer (in production)
- **Extensions**: `uuid-ossp`, `pgcrypto`, `pg_trgm`, `unaccent`

## Schema

The full schema is in `packages/db/prisma/schema.prisma`. Key design decisions:

- Every tenant-owned table has `org_id UUID NOT NULL` with `ON DELETE CASCADE`
- Soft deletes use `deleted_at TIMESTAMP` — never hard-delete issues or docs in the app
- `rank FLOAT` on issues enables fractional index ordering (no gaps to fill on reorder)
- `issue_key` is denormalized (`ENG-42`) for display and search performance
- JSONB for rich content (`description`, `body`, `content`) — flexible without migrations for content schema changes

## Migrations

```bash
# Create a new migration (generates SQL + updates schema)
pnpm --filter @pm/db -- prisma migrate dev --name <description>

# Apply migrations (CI/production)
pnpm --filter @pm/db migrate:deploy

# Reset database (dev only — drops all data)
pnpm --filter @pm/db migrate:reset

# View migration history
pnpm --filter @pm/db -- prisma migrate status
```

## Row-Level Security

RLS is applied **after** the first migration. Run the RLS script:

```bash
psql $DATABASE_URL -f scripts/rls-policies.sql
```

This script:
1. Creates helper functions to read session-local settings
2. Enables RLS on every tenant-owned table
3. Creates SELECT/INSERT/UPDATE/DELETE policies per table
4. Creates GIN indexes for full-text search (`pg_trgm`)
5. Creates composite indexes for common query patterns

The app sets these session variables at the start of every transaction via `withRls()` in `packages/db/src/withRls.ts`:
```sql
SET LOCAL app.current_org_id = '<uuid>';
SET LOCAL app.current_user_id = '<uuid>';
SET LOCAL app.current_role = 'tenant_member';
```

## Seed Data

```bash
pnpm --filter @pm/db seed
```

Creates:
- Platform admin: `admin@platform.dev` / `Password123!`
- Demo admin: `demo@acme.dev` / `Password123!`
- Demo member: `member@acme.dev` / `Password123!`
- Demo org: `acme` (Pro plan)
- Project: `ENG` (Scrum, with default statuses)
- 2 sprints (1 completed, 1 active)
- 7 sample issues
- Feature flags (all enabled)

## Performance

Key indexes created by `rls-policies.sql`:
```sql
-- Full-text search
issues_title_trgm_idx ON issues USING gin(title gin_trgm_ops)
docs_title_trgm_idx ON docs USING gin(title gin_trgm_ops)

-- Common list queries
issues_org_project_idx ON issues(org_id, project_id, deleted_at)
issues_assignee_idx ON issues(org_id, assignee_id)

-- Notification inbox
notifications_user_unread_idx ON notifications(user_id, org_id, read_at) WHERE read_at IS NULL

-- Audit log viewer
audit_logs_org_actor_idx ON audit_logs(org_id, actor_id, created_at DESC)

-- Session validation
sessions_user_active_idx ON sessions(user_id, revoked_at) WHERE revoked_at IS NULL
```

## Database Users

| User | Purpose | Privileges |
|------|---------|------------|
| `app_user` | Application runtime | SELECT/INSERT/UPDATE/DELETE, RLS applies |
| `app_migration` | Prisma migrations only | SUPERUSER, bypasses RLS |
| `app_readonly` | Analytics jobs | SELECT only, RLS applies |

Never connect as `postgres` superuser from the application.

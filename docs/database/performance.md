# Database Performance

## Key Indexes

All indexes are defined at the bottom of `scripts/rls-policies.sql` and are created idempotently with `IF NOT EXISTS`.

### GIN indexes for full-text search

```sql
CREATE INDEX IF NOT EXISTS issues_title_trgm_idx ON issues USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS docs_title_trgm_idx   ON docs   USING gin(title gin_trgm_ops);
```

These support the trigram-based search (`%` operator and `ILIKE '%term%'` with `pg_trgm`). Without them, title search requires a full table scan. The `pg_trgm` extension is enabled in `init-db.sql`.

For full-document search, issue `description` (JSONB) is indexed by extracting the text and creating a `tsvector`. This is handled in the `search-index` BullMQ queue which writes pre-computed search vectors to a dedicated column.

### Composite indexes for common query patterns

```sql
-- Most common query: list issues in a project, excluding deleted
CREATE INDEX IF NOT EXISTS issues_org_project_idx
  ON issues(org_id, project_id, deleted_at);

-- Assigned-to-me dashboard
CREATE INDEX IF NOT EXISTS issues_assignee_idx
  ON issues(org_id, assignee_id);

-- Unread notification count
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications(user_id, org_id, read_at)
  WHERE read_at IS NULL;

-- Audit log queries by org + time range
CREATE INDEX IF NOT EXISTS audit_logs_org_actor_idx
  ON audit_logs(org_id, actor_id, created_at DESC);

-- Active session lookup
CREATE INDEX IF NOT EXISTS sessions_user_active_idx
  ON sessions(user_id, revoked_at)
  WHERE revoked_at IS NULL;
```

Partial indexes (with `WHERE`) are more efficient than full indexes when the filtered subset is small — a typical user has far more revoked sessions than active ones.

## Query Patterns to Avoid

### N+1 queries

**Bad:** Fetching a list of issues then querying each issue's assignee separately.

```typescript
// This causes N+1 queries
const issues = await prisma.issue.findMany({ where: { projectId } });
for (const issue of issues) {
  const assignee = await prisma.user.findUnique({ where: { id: issue.assigneeId } });
}
```

**Good:** Use Prisma `include` to join in a single query.

```typescript
const issues = await prisma.issue.findMany({
  where: { projectId },
  include: { assignee: { select: { id: true, fullName: true, avatarUrl: true } } },
});
```

### Missing `orgId` in WHERE clauses

Always include `orgId` in queries on tables that have it. Without it, Postgres cannot use the composite index and may fall back to a sequential scan even when RLS would filter the results anyway.

```typescript
// Bad: relies on RLS alone for filtering — full table scan on issues
await prisma.issue.findMany({ where: { projectId } });

// Good: composite index (org_id, project_id, deleted_at) is used
await prisma.issue.findMany({ where: { projectId, orgId, deletedAt: null } });
```

### Unconstrained list queries

Always paginate. Use cursor-based pagination (see `api/README.md`) rather than `OFFSET` pagination which degrades at large offsets.

```typescript
// Bad: returns all issues with no limit
const issues = await prisma.issue.findMany({ where: { projectId, orgId } });

// Good: cursor pagination
const issues = await prisma.issue.findMany({
  where: { projectId, orgId, deletedAt: null },
  take: 26,
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,
  orderBy: { rank: 'asc' },
});
```

### Selecting `*` on wide tables

Use `select` to fetch only the columns needed. The `issues` table has ~20 columns including the `description` JSONB field which can be large. List views should not include `description`.

```typescript
// Issue list (board/backlog): exclude description
const issues = await prisma.issue.findMany({
  where: { projectId, orgId, deletedAt: null },
  select: {
    id: true, issueKey: true, title: true, type: true, priority: true,
    statusId: true, assigneeId: true, rank: true, estimate: true, dueDate: true,
    assignee: { select: { id: true, fullName: true, avatarUrl: true } },
  },
});

// Issue detail: include description
const issue = await prisma.issue.findUnique({
  where: { id: issueId },
  include: { assignee: true, reporter: true, comments: true, attachments: true },
});
```

## `rank` Float Reordering Pattern

Issues are ordered by the `rank` float column. Moving an issue sets its rank to the midpoint of its neighbours:

```typescript
// Moving issue between beforeRank and afterRank
const newRank = (beforeRank + afterRank) / 2;
await prisma.issue.update({
  where: { id: issueId },
  data: { rank: newRank },
});
```

Over time, midpoint calculations converge toward zero (or toward each other), causing floating point precision loss. When the gap between two adjacent ranks falls below `1e-10`, the service rebalances a contiguous range back to integer spacing:

```typescript
const REBALANCE_THRESHOLD = 1e-10;

async function maybeRebalance(projectId: string, orgId: string) {
  const issues = await prisma.issue.findMany({
    where: { projectId, orgId, deletedAt: null },
    orderBy: { rank: 'asc' },
    select: { id: true, rank: true },
  });

  let needsRebalance = false;
  for (let i = 1; i < issues.length; i++) {
    if (issues[i].rank - issues[i - 1].rank < REBALANCE_THRESHOLD) {
      needsRebalance = true;
      break;
    }
  }

  if (needsRebalance) {
    await Promise.all(
      issues.map((issue, i) =>
        prisma.issue.update({ where: { id: issue.id }, data: { rank: (i + 1) * 1000 } })
      )
    );
  }
}
```

## PgBouncer Connection Pooling

In production, the API connects to PostgreSQL through PgBouncer in **transaction-mode pooling**. This is required because:
- The API uses a connection pool internally via Prisma
- Without PgBouncer, each API pod opens up to `pool_size` connections, and with 10 pods that could be 100+ connections to PostgreSQL directly
- PgBouncer multiplexes many client connections to a smaller number of server connections

Transaction mode means a physical database connection is assigned only for the duration of a transaction and returned immediately. This is compatible with the `withRls` pattern because the `set_config(..., true)` call is transaction-local.

Example PgBouncer config (`pgbouncer.ini`):
```ini
[databases]
pm_db = host=postgres port=5432 dbname=pm_db

[pgbouncer]
pool_mode = transaction
max_client_conn = 500
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
server_reset_query = DISCARD ALL
```

The `DATABASE_URL` for the application points to PgBouncer, not directly to PostgreSQL.

## Monitoring Query Performance

Use `pg_stat_statements` (enabled by default in PostgreSQL 16) to identify slow queries:

```sql
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  rows
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries averaging over 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;
```

Use `pg_stat_activity` to see currently running queries:

```sql
SELECT
  pid,
  now() - query_start AS duration,
  state,
  left(query, 100) AS query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;
```

Kill a stuck query:

```sql
SELECT pg_cancel_backend(<pid>);  -- gentle SIGINT
SELECT pg_terminate_backend(<pid>); -- hard SIGTERM
```

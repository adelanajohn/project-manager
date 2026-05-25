# PostgreSQL Row-Level Security

## How Session Variables Are Set

Row-Level Security policies in this application rely on three PostgreSQL session-local configuration variables:

| Variable | Type | Set from |
|----------|------|----------|
| `app.current_org_id` | `uuid` | `JwtPayload.orgId` |
| `app.current_user_id` | `uuid` | `JwtPayload.sub` |
| `app.current_role` | `text` | `JwtPayload.role` |

The `withRls()` function in `packages/db/src/withRls.ts` wraps every Prisma operation in a transaction that sets these variables first:

```typescript
export function withRls(prisma: PrismaClient, ctx: RlsContext): PrismaClient {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            prisma.$executeRawUnsafe(
              `SELECT set_config('app.current_org_id', $1, true),
                      set_config('app.current_user_id', $2, true),
                      set_config('app.current_role', $3, true)`,
              ctx.orgId,
              ctx.userId,
              ctx.role
            ),
            query(args) as any,
          ]);
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}
```

The third argument to `set_config` is `true` which makes the setting **transaction-local** — it is automatically unset when the transaction ends. This prevents one request's context from leaking into the next connection pool checkout.

The API's RLS plugin (`apps/api/src/plugins/rls.ts`) calls `withRls` on every authenticated request:

```typescript
request.db = withRls(prisma, {
  orgId: payload.orgId,
  userId: payload.sub,
  role: payload.role ?? 'tenant_member',
});
```

Unauthenticated requests (public routes like `/health`, `/api/v1/auth/signup`) get the bare `prisma` client. Those routes must not query tables with RLS enabled except through the service layer which adds explicit `orgId` filters.

## The Three Helper Functions

These SQL functions are defined in `scripts/rls-policies.sql` and called inside every policy `USING` clause:

```sql
CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid AS $$
BEGIN
  RETURN nullif(current_setting('app.current_org_id', true), '')::uuid;
EXCEPTION WHEN others THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid AS $$
BEGIN
  RETURN nullif(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION WHEN others THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS text AS $$
BEGIN
  RETURN nullif(current_setting('app.current_role', true), '');
EXCEPTION WHEN others THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

The `EXCEPTION WHEN others THEN RETURN NULL` guard prevents a missing config from throwing an error — it simply returns `NULL`, which causes the policy to evaluate to `false` and deny access. This is the safe default.

## RLS Policy SQL Examples

### Simple org-isolation policy

The majority of tables just check that the row's `org_id` matches the current org:

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

CREATE POLICY projects_isolation ON projects
  USING (org_id = current_org_id());
```

`FORCE ROW LEVEL SECURITY` applies the policy even to the table owner, preventing accidental bypasses.

### Split SELECT / INSERT / UPDATE / DELETE policies (issues table)

Some tables need different rules for each operation:

```sql
-- Anyone in the org can read issues
CREATE POLICY issues_select ON issues FOR SELECT
  USING (org_id = current_org_id());

-- Anyone in the org can create issues (org check only)
CREATE POLICY issues_insert ON issues FOR INSERT
  WITH CHECK (org_id = current_org_id());

-- Only the reporter, assignee, or an admin/manager can update
CREATE POLICY issues_update ON issues FOR UPDATE
  USING (
    org_id = current_org_id()
    AND (
      reporter_id = current_user_id()
      OR assignee_id = current_user_id()
      OR current_user_role() IN ('tenant_admin', 'tenant_manager')
    )
  );

-- Only the reporter or an admin/manager can delete
CREATE POLICY issues_delete ON issues FOR DELETE
  USING (
    org_id = current_org_id()
    AND (
      reporter_id = current_user_id()
      OR current_user_role() IN ('tenant_admin', 'tenant_manager')
    )
  );
```

### Notifications (own-record policy)

Notifications are strictly per-user:

```sql
CREATE POLICY notifications_own ON notifications
  USING (
    org_id = current_org_id()
    AND user_id = current_user_id()
  );
```

### Audit logs (append-only)

Audit logs can be inserted by workers (which set `WITH CHECK (true)`), read by admins, and never deleted:

```sql
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (
    org_id = current_org_id()
    AND current_user_role() IN ('tenant_admin', 'tenant_manager')
  );

CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (true);  -- workers write without user context

CREATE POLICY audit_logs_nodelete ON audit_logs FOR DELETE
  USING (false);  -- no one can delete audit logs
```

## Tables with RLS Enabled

| Table | Policy type | Notes |
|-------|-------------|-------|
| `organizations` | Org isolation + membership check | SELECT requires org membership or orgId match |
| `projects` | Org isolation | Simple `org_id = current_org_id()` |
| `issues` | Split policies | UPDATE/DELETE restricted by role or ownership |
| `sprints` | Org isolation | |
| `epics` | Org isolation | |
| `comments` | Split policies | UPDATE restricted to author or admin/manager |
| `docs` | Org isolation | |
| `notifications` | Own-record | `user_id = current_user_id()` |
| `org_members` | Select by org; modify by admin | Only `tenant_admin` can add/remove members |
| `labels` | Org isolation | |
| `attachments` | Org isolation | |
| `audit_logs` | Append-only | No deletes; select by admin/manager only |

Tables **without** RLS (safe because they have no org dimension or are platform-scoped):
- `users` — no org column; queried by email/id with explicit filters
- `sessions` — no org column; always queried by `userId`
- `api_keys` — scoped by `userId`
- `subscriptions` — queried by org admin via service layer
- `feature_flags` / `feature_flag_overrides` — platform admin only

## Testing RLS in psql

Connect as `app_user` (the normal runtime role):

```sql
-- Set session variables as the middleware does
SELECT set_config('app.current_org_id', 'org-uuid-here', false),
       set_config('app.current_user_id', 'user-uuid-here', false),
       set_config('app.current_role', 'tenant_member', false);

-- Should return only rows for that org
SELECT id, title FROM issues LIMIT 5;

-- Try with a different org — should return 0 rows
SELECT set_config('app.current_org_id', 'other-org-uuid', false);
SELECT id, title FROM issues LIMIT 5;
```

To bypass RLS (as superuser or `app_migration` role):
```sql
SET SESSION AUTHORIZATION app_migration;
SELECT count(*) FROM issues;  -- returns all rows
```

## Why Three Layers Instead of One

Using only RLS (layer 3) would be sufficient for data isolation, but adds operational risk:
- A misconfigured session variable (empty string, wrong format) would return 0 rows instead of the correct data, causing silent data loss from the application's perspective.
- Debugging RLS failures is harder than application-level permission errors.

Using only application-layer checks (layer 1 + 2) without RLS is dangerous:
- A single code path that forgets to add an `orgId` filter becomes a data leak.
- SQL injection in any parameterised query that isn't fully parameterised could expose cross-tenant data.

The three layers together mean a vulnerability in one layer does not result in a breach — both other layers must also be compromised. This is defence in depth.

# RLS Policy Reference

Full policy SQL lives in `scripts/rls-policies.sql`. This document maps each table to its policies and explains the logic.

## Policy Summary by Table

### `organizations`

```sql
-- SELECT: members of the org or queries matching orgId
CREATE POLICY orgs_select ON organizations FOR SELECT
  USING (
    id = current_org_id()
    OR EXISTS (
      SELECT 1 FROM org_members
      WHERE org_id = organizations.id AND user_id = current_user_id()
    )
  );

-- ALL (INSERT/UPDATE/DELETE): only within the current org
CREATE POLICY orgs_modify ON organizations FOR ALL
  USING (id = current_org_id());
```

The SELECT policy allows a membership check so that a user can list all their orgs (needed for the org switcher). The modify policy is tighter — only operations on the current org context are allowed.

### `projects`

```sql
CREATE POLICY projects_isolation ON projects
  USING (org_id = current_org_id());
```

Simple org isolation. Applies to all operations.

### `issues`

Issues have the most granular policies because update and delete access depends on ownership and role.

```sql
-- Any org member can read any issue in the org
CREATE POLICY issues_select ON issues FOR SELECT
  USING (org_id = current_org_id());

-- Any org member can create issues
CREATE POLICY issues_insert ON issues FOR INSERT
  WITH CHECK (org_id = current_org_id());

-- Update: reporter, assignee, or admin/manager
CREATE POLICY issues_update ON issues FOR UPDATE
  USING (
    org_id = current_org_id()
    AND (
      reporter_id = current_user_id()
      OR assignee_id = current_user_id()
      OR current_user_role() IN ('tenant_admin', 'tenant_manager')
    )
  );

-- Delete: reporter or admin/manager
CREATE POLICY issues_delete ON issues FOR DELETE
  USING (
    org_id = current_org_id()
    AND (
      reporter_id = current_user_id()
      OR current_user_role() IN ('tenant_admin', 'tenant_manager')
    )
  );
```

### `sprints` / `epics` / `docs` / `labels` / `attachments`

All use simple org isolation:

```sql
CREATE POLICY <table>_isolation ON <table>
  USING (org_id = current_org_id());
```

### `comments`

```sql
CREATE POLICY comments_select ON comments FOR SELECT
  USING (org_id = current_org_id());

CREATE POLICY comments_insert ON comments FOR INSERT
  WITH CHECK (org_id = current_org_id());

-- Update own comments; admins and managers can edit any
CREATE POLICY comments_update ON comments FOR UPDATE
  USING (
    org_id = current_org_id()
    AND (
      author_id = current_user_id()
      OR current_user_role() IN ('tenant_admin', 'tenant_manager')
    )
  );
```

### `notifications`

Own-record policy: users can only see their own notifications.

```sql
CREATE POLICY notifications_own ON notifications
  USING (
    org_id = current_org_id()
    AND user_id = current_user_id()
  );
```

### `org_members`

```sql
-- All org members can see the member list
CREATE POLICY org_members_select ON org_members FOR SELECT
  USING (org_id = current_org_id());

-- Only admins can add, modify, or remove members
CREATE POLICY org_members_modify ON org_members FOR ALL
  USING (
    org_id = current_org_id()
    AND current_user_role() IN ('tenant_admin')
  );
```

### `audit_logs`

Append-only: inserts from workers always succeed; reads restricted to admins; deletes permanently blocked.

```sql
-- Admins and managers can view audit logs for their org
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (
    org_id = current_org_id()
    AND current_user_role() IN ('tenant_admin', 'tenant_manager')
  );

-- Workers write without user context (no user session variables set)
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (true);

-- No one can delete audit log entries
CREATE POLICY audit_logs_nodelete ON audit_logs FOR DELETE
  USING (false);
```

## SELECT vs INSERT vs UPDATE vs DELETE Policy Split

When `FOR ALL` is used (the default if `FOR` is omitted), the same `USING` expression applies to every operation. Use split policies when the rules differ per operation.

| Clause | Used on | Meaning |
|--------|---------|---------|
| `USING (expr)` | SELECT, UPDATE, DELETE | Row is visible/eligible for the operation only if `expr` is true |
| `WITH CHECK (expr)` | INSERT, UPDATE | The new row (after the write) must satisfy `expr` |

For UPDATE: both `USING` (which rows can be targeted) and `WITH CHECK` (what the new state must satisfy) apply. If you only specify `USING`, the `WITH CHECK` defaults to the same expression.

Example: preventing users from moving issues to a different org:

```sql
CREATE POLICY issues_update ON issues FOR UPDATE
  USING (org_id = current_org_id())          -- can only target own-org issues
  WITH CHECK (org_id = current_org_id());     -- updated row must still be in own org
```

## API Key Hash: pgcrypto Pattern

API keys are stored as SHA-256 hashes using PostgreSQL's `pgcrypto` extension (`digest()` function). The raw key is shown to the user only once at creation time.

At creation:

```typescript
// apps/api/src/routes/apiKeys.ts (pattern)
const rawKey = `pmk_${randomBytes(32).toString('hex')}`;
const keyHash = await db.$queryRaw<[{digest: string}]>`
  SELECT encode(digest(${rawKey}, 'sha256'), 'hex') AS digest
`;

await prisma.apiKey.create({
  data: { userId, name, keyHash: keyHash[0].digest },
});
```

At verification (incoming API request):

```sql
SELECT id, user_id, expires_at, revoked_at
FROM api_keys
WHERE key_hash = encode(digest($1, 'sha256'), 'hex')
  AND revoked_at IS NULL
  AND (expires_at IS NULL OR expires_at > now());
```

This means even a full database dump does not reveal any valid API key — only SHA-256 hashes are stored.

The `pgcrypto` extension is enabled in `scripts/init-db.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

# Database Migrations

## How Prisma Migrate Works

Prisma Migrate compares the current `schema.prisma` file to the migration history (the `_prisma_migrations` table in the database) and generates SQL to bring the database up to date.

The migration history is tracked in `packages/db/prisma/migrations/`. Each migration is a directory containing a `migration.sql` file. These files are committed to git and should never be manually edited after they have been applied to any environment.

## Creating a Migration

Always run migrations from the `@pm/db` package directory (or use `--filter`):

```bash
# Interactive: Prisma prompts for a migration name
pnpm --filter @pm/db exec prisma migrate dev --name describe-your-change

# Example:
pnpm --filter @pm/db exec prisma migrate dev --name add-issue-estimate-min
```

This command:
1. Generates a SQL migration in `packages/db/prisma/migrations/<timestamp>_<name>/migration.sql`
2. Applies the migration to your development database
3. Regenerates the Prisma client

Commit both the updated `schema.prisma` and the new `migrations/` directory in the same commit.

### After modifying `schema.prisma`

If you add a field or model, you must create a migration. Changing a `@default()` or `@map()` annotation also requires a migration. Changing only relation field names (not the underlying FK column) does not.

## `migrate:deploy` vs `migrate:dev`

| Command | Usage | What it does |
|---------|-------|--------------|
| `prisma migrate dev` | Local development only | Creates and applies migrations; resets DB if drift detected; regenerates client |
| `prisma migrate deploy` | CI and production | Applies pending migrations only; never resets; fails if drift detected |

**Never run `migrate dev` against a production database.** It can reset the database if it detects an inconsistency.

In CI (`.github/workflows/ci.yml`):

```yaml
- name: Run DB migrations
  run: pnpm --filter @pm/db migrate:deploy
  env:
    DATABASE_URL: postgresql://app_user:password@localhost:5432/pm_db_test
```

In production (from `ops/deployment.md`), migrations run as an init container or a pre-start step before the API container starts.

## Handling Breaking Schema Changes in Production

Breaking changes are those that remove columns, rename columns, change column types, or add non-nullable columns without defaults.

### Pattern: Expand–Contract

Use the expand–contract pattern to deploy breaking changes without downtime:

**Phase 1 — Expand** (deploy first):
- Add the new column as nullable (or with a default)
- Keep the old column
- Update application code to write to both columns

```sql
-- migration: add-new-column
ALTER TABLE issues ADD COLUMN new_status_id uuid REFERENCES project_statuses(id);
```

**Phase 2 — Migrate** (run a data migration):
- Backfill the new column from the old column
- Can be done as a BullMQ job in the `cleanup` queue or a standalone script

```typescript
// scripts/backfill-new-status.ts
await prisma.$executeRaw`
  UPDATE issues SET new_status_id = status_id WHERE status_id IS NOT NULL
`;
```

**Phase 3 — Contract** (deploy after backfill is complete):
- Remove the old column
- Make the new column non-nullable if appropriate

```sql
-- migration: drop-old-column
ALTER TABLE issues DROP COLUMN status_id;
ALTER TABLE issues RENAME COLUMN new_status_id TO status_id;
```

### Adding a non-nullable column

Always add a `DEFAULT` value in the migration so existing rows are not null:

```sql
ALTER TABLE issues ADD COLUMN cycle_time_minutes integer NOT NULL DEFAULT 0;
```

If there is no sensible default, add as nullable first, backfill, then add the NOT NULL constraint:

```sql
-- Phase 1
ALTER TABLE issues ADD COLUMN resolved_at timestamptz;
-- Phase 2 (backfill)
-- Phase 3
ALTER TABLE issues ALTER COLUMN resolved_at SET NOT NULL;
```

## The `app_migration` Role

The `app_migration` role is defined in `scripts/init-db.sql` with superuser privileges. Use this role for:
- Running `prisma migrate deploy` in CI and production
- Running the `rls-policies.sql` script (requires `ALTER TABLE` and `CREATE POLICY` privileges)
- Granting table access to `app_user`

The runtime application uses the `app_user` role, which has standard DML privileges but cannot modify schemas or policies.

To run migrations manually with the migration role:

```bash
DATABASE_URL=postgresql://app_migration:migration_password@localhost:5432/pm_db \
  pnpm --filter @pm/db exec prisma migrate deploy
```

After running a migration, re-run `rls-policies.sql` if you added new tables that need RLS policies:

```bash
psql postgresql://app_migration:migration_password@localhost:5432/pm_db \
  -f scripts/rls-policies.sql
```

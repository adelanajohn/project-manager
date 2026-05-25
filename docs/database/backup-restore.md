# Backup and Restore

## Backup Strategy

Backups use `pg_dump` in custom format (compressed, supports parallel restore). A backup script runs as a scheduled task (cron or a `cleanup` queue job on a daily schedule).

### Backup command

```bash
pg_dump \
  --format=custom \          # compressed binary format
  --compress=9 \             # max compression
  --no-acl \                 # skip GRANT/REVOKE (handled by init-db.sql)
  --no-owner \               # skip ownership changes
  "$DATABASE_URL" \
  > "/backups/pm_db_$(date +%Y%m%d_%H%M%S).dump"
```

The dump includes all data, schema, indexes, functions, and RLS policies.

### S3 Encrypted Upload

After creating the dump, it is encrypted and uploaded to S3:

```bash
# Encrypt with AES-256 using a KMS-managed key (via AWS CLI)
aws s3 cp \
  "/backups/pm_db_${TIMESTAMP}.dump" \
  "s3://${BACKUP_BUCKET}/postgres/pm_db_${TIMESTAMP}.dump" \
  --sse aws:kms \
  --sse-kms-key-id "${BACKUP_KMS_KEY_ID}" \
  --storage-class STANDARD_IA

# Verify upload
aws s3 ls "s3://${BACKUP_BUCKET}/postgres/" | tail -5
```

If you are not on AWS, use `openssl enc` to encrypt locally before upload:

```bash
openssl enc -aes-256-cbc \
  -in "pm_db_${TIMESTAMP}.dump" \
  -out "pm_db_${TIMESTAMP}.dump.enc" \
  -pass env:BACKUP_PASSPHRASE
```

Store the passphrase in a secrets manager (AWS Secrets Manager, Vault, etc.), not in the backup bucket.

### 30-Day Retention

S3 lifecycle rules delete backups older than 30 days. Configure via Terraform or the AWS Console:

```json
{
  "Rules": [{
    "Status": "Enabled",
    "Filter": { "Prefix": "postgres/" },
    "Expiration": { "Days": 30 }
  }]
}
```

For compliance reasons, you may want to keep monthly backups for 1 year. Add a second rule that transitions objects with the `monthly-` prefix to Glacier Deep Archive.

## Point-in-Time Restore Procedure

This procedure restores the database to a specific backup. Perform this on a **clone/staging** environment first and validate before doing it in production.

### Step 1: Download and decrypt the backup

```bash
# List available backups
aws s3 ls s3://${BACKUP_BUCKET}/postgres/ --recursive

# Download the target backup
aws s3 cp \
  "s3://${BACKUP_BUCKET}/postgres/pm_db_20241201_020000.dump" \
  /tmp/pm_db_restore.dump \
  --sse aws:kms
```

### Step 2: Stop the API and worker

Prevent writes during restore:

```bash
docker compose stop api worker
```

### Step 3: Drop and recreate the database

```bash
psql postgresql://app_migration:migration_password@localhost:5432/postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'pm_db';"

psql postgresql://app_migration:migration_password@localhost:5432/postgres \
  -c "DROP DATABASE IF EXISTS pm_db;"

psql postgresql://app_migration:migration_password@localhost:5432/postgres \
  -c "CREATE DATABASE pm_db OWNER app_user;"
```

### Step 4: Restore the dump

```bash
pg_restore \
  --format=custom \
  --dbname=postgresql://app_migration:migration_password@localhost:5432/pm_db \
  --jobs=4 \      # parallel restore for speed
  --no-acl \
  --no-owner \
  /tmp/pm_db_restore.dump
```

### Step 5: Re-apply RLS policies

The dump includes RLS policies, but re-running the script is safe (it uses `DROP POLICY IF EXISTS` + `CREATE POLICY`):

```bash
psql postgresql://app_migration:migration_password@localhost:5432/pm_db \
  -f scripts/rls-policies.sql
```

### Step 6: Validate

```bash
psql postgresql://app_user:password@localhost:5432/pm_db \
  -c "SELECT count(*) FROM organizations;"

psql postgresql://app_user:password@localhost:5432/pm_db \
  -c "SELECT count(*) FROM issues WHERE deleted_at IS NULL;"

# Check that RLS helper functions exist
psql postgresql://app_user:password@localhost:5432/pm_db \
  -c "SELECT current_org_id();"
```

### Step 7: Restart the services

```bash
docker compose start api worker
```

Monitor the health endpoint:

```bash
curl http://localhost:3000/health/ready
# Expected: {"status":"ready","checks":{"database":"ok","redis":"ok"}}
```

## Testing Restores

Restores must be tested regularly — an untested backup is not a backup. Schedule a monthly restore test:

1. Spin up a temporary PostgreSQL instance (e.g., a Docker container)
2. Restore the most recent backup using steps 3–6 above
3. Run a smoke test: query row counts, verify RLS functions, run the integration test suite against the restored DB
4. Tear down the temporary instance

Document the last tested restore date and the result in a runbook entry.

## Monitoring Backup Health

Set up an alert that fires if no backup object has been uploaded to S3 in the last 26 hours. This catches situations where the backup job silently fails.

```bash
# Check last modified time of most recent backup
aws s3api list-objects-v2 \
  --bucket "${BACKUP_BUCKET}" \
  --prefix "postgres/" \
  --query 'sort_by(Contents, &LastModified)[-1].LastModified'
```

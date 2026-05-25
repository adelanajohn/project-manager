# Runbooks

## DB Connection Exhausted

**Symptoms:** API returns `500` with `P1001` or `P2024` (Prisma connection pool timeout). `/health/ready` shows `database: error`. Logs show `FATAL: sorry, too many clients already`.

**Cause:** The connection pool is exhausted. Common causes:
- A long-running query is holding connections
- A recent deploy increased the number of pods without adjusting PgBouncer `default_pool_size`
- A query is stuck in an open transaction

**Resolution:**

1. Check active connections:
```sql
SELECT count(*), state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE datname = 'pm_db'
GROUP BY state, wait_event_type, wait_event;
```

2. Identify the blocking query:
```sql
SELECT pid, now() - query_start AS duration, state, left(query, 200)
FROM pg_stat_activity
WHERE state = 'active' AND datname = 'pm_db'
ORDER BY duration DESC
LIMIT 10;
```

3. Kill stuck queries (try `cancel` first, then `terminate`):
```sql
SELECT pg_cancel_backend(<pid>);
-- If not responsive after 10 seconds:
SELECT pg_terminate_backend(<pid>);
```

4. If PgBouncer is deployed, check its pool status:
```bash
psql -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
psql -p 6432 -U pgbouncer pgbouncer -c "SHOW CLIENTS;"
```

5. Restart PgBouncer if the client list is stale (connections not properly closed):
```bash
docker compose restart pgbouncer
```

6. If the issue persists, temporarily reduce API replica count to relieve pressure, then investigate the root cause.

---

## Redis OOM (Out of Memory)

**Symptoms:** BullMQ jobs are not being enqueued or processed. API logs show `ReplyError: OOM command not allowed when used memory > 'maxmemory'`. Redis health check fails.

**Cause:** Redis has exceeded its memory limit. Job data, blacklist keys, or session data has grown unexpectedly.

**Resolution:**

1. Check memory usage:
```bash
redis-cli -u "$REDIS_URL" INFO memory | grep -E 'used_memory_human|maxmemory_human|mem_fragmentation_ratio'
```

2. Find the largest keys:
```bash
redis-cli -u "$REDIS_URL" --memkeys --memkeys-samples 200
```

3. Check BullMQ queue sizes:
```bash
redis-cli -u "$REDIS_URL" KEYS "bull:*" | wc -l
```

4. If completed/failed jobs are accumulating, remove them:
```typescript
// Run this as a script or in a BullMQ REPL
for (const queue of allQueues) {
  await queue.clean(0, 1000, 'completed');
  await queue.clean(0, 1000, 'failed');
}
```

5. If the blacklist keys are large (many revoked sessions), they will expire automatically within 1 hour. Verify TTLs are set:
```bash
redis-cli -u "$REDIS_URL" TTL "blacklist:$(redis-cli -u "$REDIS_URL" KEYS 'blacklist:*' | head -1)"
```

6. Increase `maxmemory` in Redis config and restart:
```bash
redis-cli -u "$REDIS_URL" CONFIG SET maxmemory 2gb
redis-cli -u "$REDIS_URL" CONFIG SET maxmemory-policy allkeys-lru
```

7. For a long-term fix, configure a memory limit in `docker-compose.prod.yml` and set `maxmemory-policy allkeys-lru` in the Redis config so Redis evicts old cached data under memory pressure.

---

## BullMQ Job Stuck in Delayed State

**Symptoms:** Jobs remain in `delayed` state and are never picked up. Queue depth grows. Bull Board shows a large `delayed` count but `active` count stays at 0.

**Cause:** Common causes:
- Worker process crashed or was killed mid-processing
- Clock skew between the API server (which schedules the delay) and the worker server
- A job was added with a `delay` option and the delay period has passed but the worker is not polling

**Resolution:**

1. Check if workers are running:
```bash
docker compose ps worker
docker compose logs --tail=50 worker
```

2. If workers are running but stuck, check for a lock issue. BullMQ uses a lock to claim jobs. If the lock is stuck, promote delayed jobs:
```typescript
// From the Bull Board UI: click "Promote" on delayed jobs
// Or programmatically:
const delayedJobs = await notificationQueue.getDelayed();
for (const job of delayedJobs) {
  await job.promote();
}
```

3. Check Redis clock vs system clock. If there is more than a few seconds of skew, delayed jobs may wait longer than expected:
```bash
date  # system clock
redis-cli -u "$REDIS_URL" TIME  # Redis clock
```

4. Restart the worker container. BullMQ workers resume cleanly:
```bash
docker compose restart worker
```

5. If jobs are stuck in `active` state (worker crashed mid-job), they need to be manually failed or the stalled job check interval will eventually move them back to waiting. The `Worker` is configured with `stalledInterval` — confirm this is set in `apps/worker/src/index.ts`.

---

## Org Suspended — How to Lift

**Symptoms:** All API requests for a specific org return `403` with `message: "This organization has been suspended"`.

**When to use:** A customer has resolved the issue that caused suspension (payment dispute resolved, policy violation corrected, etc.).

**Resolution:**

1. Verify the org is suspended and get its ID:
```bash
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  "https://api.example.com/api/v1/admin/orgs?q=<org-name>"
```

2. Lift the suspension by clearing `suspendedAt`:

Via the admin panel UI (preferred):
- Navigate to Admin → Organizations → Find the org → "Lift Suspension"

Via direct DB update (if admin panel is unavailable):
```sql
UPDATE organizations
SET suspended_at = NULL
WHERE id = 'org-uuid-here'
RETURNING id, name, suspended_at;
```

3. Verify the org is accessible again:
```bash
curl -H "Authorization: Bearer $ORG_ADMIN_TOKEN" \
  "https://api.example.com/api/v1/orgs/<orgId>"
# Should return 200, not 403
```

4. Create an audit log entry for the lift (the `POST /admin/orgs/:orgId/unsuspend` endpoint, when implemented, should do this automatically):
```sql
INSERT INTO audit_logs (action, resource_type, resource_id, actor_id, metadata)
VALUES ('org.unsuspended', 'organization', 'org-uuid', 'admin-user-id',
        '{"reason": "Payment dispute resolved", "ticket": "SUPPORT-1234"}'::jsonb);
```

---

## Force-Logout All Sessions for a User

**When to use:** A user's credentials may be compromised, or a security investigation requires immediately invalidating all active sessions.

**Resolution:**

1. Get the user ID:
```bash
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  "https://api.example.com/api/v1/admin/users?q=user@example.com"
```

2. Revoke all active sessions in the database:
```sql
UPDATE sessions
SET revoked_at = now()
WHERE user_id = 'user-uuid-here'
  AND revoked_at IS NULL;
```

3. Add all active session IDs to the Redis blacklist so in-flight access tokens are immediately invalidated (access tokens are valid for 15 minutes even after session revocation otherwise):
```sql
-- Get the session IDs to blacklist
SELECT id FROM sessions
WHERE user_id = 'user-uuid-here'
AND revoked_at >= now() - interval '1 second';
```

```bash
# Blacklist each session ID (TTL = 1 hour = access token max lifetime)
redis-cli -u "$REDIS_URL" SET "blacklist:<session-id>" 1 EX 3600
```

4. (Optional) Force a password reset:
```sql
-- Expire the password to force reset on next login
-- (implement via forgot-password flow or direct Redis token)
```

5. Notify the user by email that their sessions were terminated and provide a password reset link if credentials are suspected compromised.

6. Log the action in the audit log:
```sql
INSERT INTO audit_logs (action, actor_id, resource_type, resource_id, metadata)
VALUES (
  'user.sessions_force_revoked',
  'admin-user-uuid',
  'user',
  'target-user-uuid',
  '{"reason": "Security investigation", "ticket": "SEC-42"}'::jsonb
);
```

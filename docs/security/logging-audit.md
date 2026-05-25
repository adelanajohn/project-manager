# Logging and Audit Trail

## Structured Logging with Pino

All logging uses [Pino](https://getpino.io), configured in `apps/api/src/app.ts` (HTTP layer) and individually in each worker processor.

### Log Levels

| Level | Used for |
|-------|----------|
| `fatal` | Process-crashing errors |
| `error` | Unhandled exceptions, failed operations that affect users |
| `warn` | Expected problems: account lockouts, token reuse, missing optional data |
| `info` | Request lifecycle events, job completions, service starts |
| `debug` | WebSocket connections, detailed flow tracing (disabled in production) |

Production uses `info` level. Development uses `debug`.

### Log Shape

Every log line emitted by the API is a JSON object. Example:

```json
{
  "level": 30,
  "time": 1720000000000,
  "pid": 1234,
  "hostname": "pm-api-7d8b9",
  "correlationId": "req_abc123",
  "reqId": "req_abc123",
  "req": {
    "method": "PATCH",
    "url": "/api/v1/issues/issue-uuid",
    "host": "api.example.com",
    "remoteAddress": "10.0.0.1"
  },
  "msg": "Issue updated"
}
```

In development, Pino Pretty renders this as colorised, human-readable output.

### Redaction

Sensitive fields are automatically redacted to `[REDACTED]` before logging:

```typescript
redact: {
  paths: [
    'req.headers.authorization',  // never log bearer tokens
    'req.headers.cookie',          // never log cookies
    '*.password',                  // any nested password field
    '*.token',                     // any nested token field
    '*.secret',                    // any nested secret field
  ],
  censor: '[REDACTED]',
},
```

**Never** add user passwords, API keys, JWT tokens, or PII to log messages. Log IDs (user ID, org ID) and operation names instead.

## Correlation ID Tracing

A `correlationId` is generated at the start of every request and propagated through the full call chain.

### HTTP Requests

The `correlationId` plugin (`apps/api/src/plugins/correlationId.ts`) runs as the first `onRequest` hook:

```typescript
const correlationId =
  request.headers['x-correlation-id'] ||  // honour upstream value
  request.headers['x-request-id'] ||       // fallback
  `req_${randomUUID()}`;                    // generate new

request.correlationId = correlationId;
reply.header('x-correlation-id', correlationId);

// All subsequent log calls from this request include correlationId
request.log = request.log.child({ correlationId });
```

The client receives the `x-correlation-id` header in every response. When reporting bugs, share this header value to trace the exact request.

### BullMQ Jobs

Every job payload includes `correlationId` (set to the originating request's ID, or a synthetic value for scheduled jobs). The processor creates a child logger immediately:

```typescript
export async function auditProcessor(job: Job) {
  const log = logger.child({
    correlationId: job.data.correlationId,
    jobId: job.id,
    queue: 'audit',
  });
  log.info('Processing audit job');
}
```

This links worker log lines to the originating HTTP request in your log aggregator. Search for `correlationId: "req_abc123"` to see everything from the request through to the job execution.

### WebSocket Events

WebSocket events are logged with `userId` and `orgId` rather than correlationId (which is not available on socket connections). The presence of `userId` in socket logs allows correlation to the user's JWT.

### Database Queries

Prisma does not emit per-query logs in production. Enable query logging locally by adding `log: ['query']` to the `PrismaClient` constructor in `packages/db/src/client.ts`.

## Audit Log: Schema and Events

The `audit_logs` table records security-sensitive and compliance-relevant actions:

```sql
audit_logs (
  id            uuid      PRIMARY KEY,
  org_id        uuid      -- null for platform-level events (user signup)
  actor_id      uuid      -- user who performed the action
  actor_role    text      -- role at time of action
  action        text      -- dotted event name: 'issue.deleted'
  resource_type text      -- 'issue', 'user', 'sprint', etc.
  resource_id   uuid      -- ID of the affected record
  metadata      jsonb     -- event-specific payload
  ip_address    text
  user_agent    text
  created_at    timestamptz
)
```

### Events Currently Logged

| Action | Triggered by |
|--------|-------------|
| `user.signup` | Registration |
| `user.login` | Successful login |
| `user.login_failed` | Failed login attempt |
| `user.logout` | Explicit logout |
| `user.password_reset_requested` | Forgot password |
| `user.password_reset` | Password successfully reset |
| `org.member_invited` | Invite sent |
| `org.member_role_changed` | Role updated |
| `org.member_removed` | Member removed |
| `org.suspended` | Platform admin suspends org |
| `project.created` | New project |
| `project.archived` | Project archived |
| `issue.deleted` | Issue deleted (soft delete) |
| `sprint.started` | Sprint activated |
| `sprint.completed` | Sprint closed |
| `api_key.created` | API key generated |
| `api_key.revoked` | API key revoked |
| `billing.plan_changed` | Subscription upgraded/downgraded |

### How Audit Log Entries Are Written

Audit writes go through the BullMQ `audit` queue, not synchronously. This keeps the write off the critical request path:

```typescript
// From auth.service.ts
await auditQueue.add('log', {
  correlationId: `login_${user.id}`,
  action: 'user.login',
  actorId: user.id,
  orgId: membership?.orgId,
  resourceType: 'user',
  resourceId: user.id,
  ipAddress,
});
```

The audit processor then writes to the database:

```typescript
// apps/worker/src/processors/audit.processor.ts
await prisma.auditLog.create({
  data: {
    orgId,
    actorId,
    actorRole,
    action,
    resourceType,
    resourceId,
    metadata,
    ipAddress,
    userAgent,
  },
});
```

Advantages of async audit writes:
- The HTTP request returns faster
- A temporary DB slowdown does not cause audit failures to bubble up to the user
- The audit queue has `attempts: 5` so transient failures are retried

The audit queue uses `concurrency: 20` because writes are fast (no heavy computation) and high volume (every issue update generates an audit entry).

## Retention Policy

Audit logs are retained indefinitely by default (the RLS policy prevents deletion). For GDPR compliance, personal data within `metadata` JSONB can be redacted by the GDPR worker queue.

The `cleanup` queue handles soft-deleted records (issues, comments, docs with `deletedAt` older than 30 days), but does **not** touch audit logs.

To enforce a hard retention limit (e.g., 2 years), a scheduled cleanup job should be added to the `cleanup` queue:

```typescript
// Enqueue via a cron trigger
await cleanupQueue.add('purge-old-audit-logs', {
  correlationId: `cleanup_${Date.now()}`,
  olderThanDays: 730,
});
```

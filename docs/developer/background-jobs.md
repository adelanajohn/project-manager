# Background Jobs

## BullMQ Architecture

The worker app (`apps/worker`) is a standalone Node.js process that connects to the same Redis instance as the API. It runs `BullMQ` `Worker` instances — one per queue — in a single process.

```
┌─────────────────────────────────────────────┐
│              apps/api                       │
│  issueService ──► notificationQueue.add()   │
│  authService  ──► emailQueue.add()          │
│  auditPlugin  ──► auditQueue.add()          │
└──────────────────────┬──────────────────────┘
                       │  Redis
                       ▼
┌─────────────────────────────────────────────┐
│              apps/worker                    │
│  Worker('notifications', notificationProc)  │
│  Worker('email',         emailProcessor)    │
│  Worker('audit',         auditProcessor)    │
│  Worker('search-index',  searchIndexProc)   │
│  ...                                        │
└─────────────────────────────────────────────┘
```

The API process never does blocking background work. It enqueues a job and returns immediately. The worker picks it up asynchronously.

Both the API and the worker share the same `REDIS_URL`. The API uses `maxRetriesPerRequest: 3` (safe for request-scoped operations), while the worker uses `maxRetriesPerRequest: null` (required by BullMQ workers to enable blocking `BRPOPLPUSH`).

## Queue List

| Queue name | Purpose | Concurrency | Max attempts |
|------------|---------|-------------|--------------|
| `notifications` | Create in-app notification records for issue/comment/sprint events | 10 | 3 |
| `email` | Send transactional emails via SMTP (Nodemailer) | 5 | 5 |
| `audit` | Write audit log rows to `audit_logs` table | 20 | 5 |
| `search-index` | Update full-text search index when issues/docs change | 10 | 3 |
| `analytics` | Aggregate burndown data, velocity, cycle time | 3 | 2 |
| `cleanup` | Purge soft-deleted records older than 30 days | 1 | 1 |
| `webhooks` | Deliver outbound webhook payloads to customer endpoints | 10 | 5 |
| `exports` | Generate CSV/XLSX exports and upload to S3 | 3 | 2 |
| `automations` | Execute automation rules triggered by issue events | 5 | 3 |
| `gdpr` | Handle GDPR data deletion and export requests | 1 | 2 |

## Job Payload Conventions

Every job payload **must** include a `correlationId`. This links the job execution back to the originating HTTP request in your log aggregator.

```typescript
// Minimum required fields
interface BaseJobPayload {
  correlationId: string;   // always required
  orgId?: string;          // include when available
  actorId?: string;        // user who triggered the action
}
```

Examples from the codebase:

```typescript
// Enqueueing an audit event (from auth.service.ts)
await auditQueue.add('log', {
  correlationId: `login_${user.id}`,
  action: 'user.login',
  actorId: user.id,
  orgId: membership?.orgId,
  resourceType: 'user',
  resourceId: user.id,
  ipAddress,
});

// Enqueueing a notification (from issue.service.ts)
await notificationQueue.add('issue-updated', {
  correlationId: request.correlationId,
  orgId,
  issueId: issue.id,
  actorId: userId,
  changes,
});

// Enqueueing an email (from auth.service.ts)
await emailQueue.add('verify-email', {
  correlationId: `signup_${user.id}`,
  to: user.email,
  template: 'verify-email',
  data: { fullName: user.fullName, verifyUrl },
});
```

Inside every processor, create a child logger with the correlationId so all log lines for that job share the same ID:

```typescript
export async function myProcessor(job: Job) {
  const log = logger.child({ correlationId: job.data.correlationId, jobId: job.id, queue: 'my-queue' });
  log.info('Starting job');
  // ...
}
```

## Retry Configuration

Retries are configured per queue in `apps/worker/src/index.ts`:

```typescript
const worker = new Worker(config.name, config.processor, {
  connection,
  concurrency: config.concurrency ?? 5,
  defaultJobOptions: {
    attempts: config.attempts ?? 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});
```

The `exponential` backoff doubles the delay on each retry starting at 1 second: 1s → 2s → 4s → 8s → 16s.

For the `email` queue (5 attempts), this gives: 1s, 2s, 4s, 8s, 16s — suitable for transient SMTP failures.

The `cleanup` queue uses `attempts: 1` — if a cleanup run fails, it should not retry automatically. Investigate via logs and re-queue manually.

## Dead Letter Queue Pattern

BullMQ does not have a true DLQ, but failed jobs (exhausted all attempts) move to the `failed` state and remain in Redis. You can inspect them in Bull Board.

To process failed jobs after investigation:

```typescript
// Re-queue a specific failed job from the admin panel or a script
const failedJobs = await notificationQueue.getFailed(0, 50);
for (const job of failedJobs) {
  await job.retry();
}
```

For the `webhooks` queue, failed deliveries stay in `failed` state and are visible per-organization in the admin panel so you can notify the customer. Do not auto-retry indefinitely — webhook failures after 5 attempts should surface as an alert.

## Bull Board UI

Bull Board is mounted at `/api/v1/admin/queues` and protected by `app.authenticate` + `app.requirePlatformAdmin`. Only users with `platformRole: 'platform_admin'` can access it.

To access locally:

1. Start the stack: `docker compose up`
2. Create a platform admin user (or use the seed script)
3. Log in and use the bearer token with a browser extension like `ModHeader`
4. Visit `http://localhost:3000/api/v1/admin/queues`

The dashboard shows job counts (waiting, active, completed, failed, delayed) for each queue and lets you retry or delete failed jobs.

## How to Add a New Queue

1. **Create the queue** in `apps/api/src/queues/index.ts`:

```typescript
export const myNewQueue = new Queue('my-new-queue', { connection });
```

Add it to `allQueues` so it appears in admin metrics and Bull Board.

2. **Create the processor** in `apps/worker/src/processors/myNew.processor.ts`:

```typescript
import type { Job } from 'bullmq';
import pino from 'pino';

const logger = pino({ level: 'info' });

export async function myNewProcessor(job: Job) {
  const log = logger.child({
    correlationId: job.data.correlationId,
    jobId: job.id,
    queue: 'my-new-queue',
  });
  log.info({ jobName: job.name }, 'Processing job');

  const { someField } = job.data;
  // ... implementation

  return { processed: true };
}
```

3. **Register the worker** in `apps/worker/src/index.ts`:

```typescript
import { myNewProcessor } from './processors/myNew.processor.js';

// In QUEUE_CONFIGS:
{ name: 'my-new-queue', processor: myNewProcessor, concurrency: 5, attempts: 3 },
```

4. **Enqueue jobs** from the API using the queue reference:

```typescript
import { myNewQueue } from '../queues/index.js';

await myNewQueue.add('job-name', {
  correlationId: request.correlationId,
  orgId,
  // ...
});
```

5. **Document** the new queue in this file's queue table.

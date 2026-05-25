# Monitoring

## Prometheus Metrics at `/metrics`

The API exposes Prometheus metrics at `GET /metrics`. This endpoint should be protected (not publicly accessible) — restrict access by IP allowlist or a reverse proxy rule.

Metrics are collected using `prom-client`. Key metrics exposed:

### HTTP Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_seconds` | Histogram | Request duration by method, route, status code |
| `http_requests_total` | Counter | Total requests by method, route, status code |
| `http_request_size_bytes` | Histogram | Request body size |
| `http_response_size_bytes` | Histogram | Response body size |

### BullMQ Queue Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `bullmq_queue_waiting` | Gauge | `queue` | Jobs waiting to be processed |
| `bullmq_queue_active` | Gauge | `queue` | Jobs currently being processed |
| `bullmq_queue_completed_total` | Counter | `queue` | Total completed jobs since start |
| `bullmq_queue_failed_total` | Counter | `queue` | Total failed jobs since start |
| `bullmq_queue_delayed` | Gauge | `queue` | Jobs scheduled for future execution |
| `bullmq_job_duration_seconds` | Histogram | `queue`, `job_name` | Job processing duration |

### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `db_query_duration_seconds` | Histogram | Query execution time via Prisma middleware |
| `db_connections_active` | Gauge | Active Prisma connection pool connections |

### Node.js Runtime Metrics

Exposed automatically by `prom-client`:
- `process_cpu_seconds_total`
- `process_resident_memory_bytes`
- `nodejs_heap_size_used_bytes`
- `nodejs_gc_duration_seconds`

## Pino Logs to stdout → Log Aggregator

All processes (API, worker) write structured JSON to `stdout`. In production (`NODE_ENV=production`), Pino Pretty is not used — raw JSON is emitted for ingestion by a log aggregator.

Suggested aggregators:
- **Loki + Grafana** — open source, runs in Docker
- **Datadog** — fully managed
- **CloudWatch Logs** — if on AWS ECS/EKS

Docker log driver (Loki example):

```yaml
# docker-compose.prod.yml
services:
  api:
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-pipeline-stages: |
          - json:
              expressions:
                level: level
                correlationId: correlationId
          - labels:
              level:
              correlationId:
```

### Useful log queries (LogQL / Loki)

```logql
# All errors in the last hour
{app="pm-api"} | json | level="error"

# Trace a specific correlation ID
{app="pm-api"} | json | correlationId="req_abc123"

# Slow requests (>500ms)
{app="pm-api"} | json | responseTime > 500

# Auth failures
{app="pm-api"} | json | msg=~"login.failed|token.invalid"
```

## Sentry Error Tracking

Sentry is configured via `SENTRY_DSN` in the API environment. Integration is added via `@sentry/node`:

```typescript
// apps/api/src/index.ts
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
```

Sentry captures:
- Unhandled exceptions (in the global error handler)
- 5xx responses
- BullMQ job failures (in the `worker.on('failed')` handler)

Set `SENTRY_DSN` to empty string to disable Sentry (e.g., in test environments).

## BullMQ Bull Board

The Bull Board dashboard is available at `/api/v1/admin/queues`. Access requires `platform_admin` role (JWT + Redis blacklist check). It shows:

- Job counts per queue (waiting, active, completed, failed, delayed)
- Failed job details with error stack traces
- Controls to retry or delete failed jobs

## Key Alerts to Set Up

Configure these alerts in your alerting system (Grafana Alerting, PagerDuty, etc.):

### Critical — page immediately

| Alert | Condition |
|-------|-----------|
| API down | `/health` returns non-2xx for > 2 minutes |
| Database unreachable | `/health/ready` returns `database: error` for > 1 minute |
| Redis unreachable | `/health/ready` returns `redis: error` for > 1 minute |
| Error rate spike | `http_requests_total{status=~"5.."}` rate > 1% of total requests over 5 min |

### Warning — investigate within 1 hour

| Alert | Condition |
|-------|-----------|
| High job queue depth | `bullmq_queue_waiting{queue="notifications"}` > 1000 |
| Job failure rate | `bullmq_queue_failed_total` increases by > 50 in 5 min on any queue |
| Slow P95 response time | `http_request_duration_seconds` P95 > 2s |
| Memory usage high | `process_resident_memory_bytes` > 1.5 GB on API |
| No backup created | Latest object in S3 backup bucket older than 26 hours |

### Informational — review daily

| Alert | Condition |
|-------|-----------|
| Large number of active sessions for one user | Unusual session count per user (possible account sharing or token theft) |
| Account lockout spike | `user.login_failed` audit events > 100 in 1 hour for any single email domain |

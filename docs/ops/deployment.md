# Deployment

## Docker Compose for Production

The `docker-compose.yml` in the repo root defines all services. In production, use a separate override file (`docker-compose.prod.yml`) to remove development-only settings like bind mounts.

Services:
- `postgres` — PostgreSQL 16 Alpine
- `redis` — Redis 7 Alpine with `--appendonly yes` (AOF persistence)
- `api` — Fastify REST API + Socket.IO
- `worker` — BullMQ job processors
- `web` — React SPA served by Nginx

Start everything:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Environment Variables Checklist

All required variables are documented in `apps/api/.env.example`. Every variable is validated at startup by Zod — the process exits with a clear error message if any required variable is missing.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string: `postgresql://user:pass@host:5432/dbname` |
| `REDIS_URL` | Redis connection string: `redis://host:6379` |
| `JWT_PRIVATE_KEY` | Base64-encoded PEM RS256 private key |
| `JWT_PUBLIC_KEY` | Base64-encoded PEM RS256 public key |

### Optional with defaults

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | `3000` | API listen port |
| `NODE_ENV` | `development` | Set to `production` |
| `APP_URL` | `http://localhost:3000` | Used in email links |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed origins |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime |
| `S3_REGION` | `us-east-1` | |
| `SMTP_PORT` | `587` | |
| `SMTP_FROM` | `noreply@example.com` | |

### Optional features

| Variable | Notes |
|----------|-------|
| `S3_BUCKET` | Required for file attachments |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Required if not using IAM roles |
| `S3_ENDPOINT` | Set for S3-compatible services (MinIO, Cloudflare R2) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Required for email sending |
| `SENTRY_DSN` | Required for error tracking |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Required for billing |

### Generating RSA key pair

```bash
# Generate private key
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem

# Derive public key
openssl rsa -pubout -in private.pem -out public.pem

# Base64-encode for environment variables (single line, no newlines)
base64 -w 0 private.pem  # JWT_PRIVATE_KEY value
base64 -w 0 public.pem   # JWT_PUBLIC_KEY value
```

## Running Migrations Before Starting the API

Migrations must be applied before the API starts. Otherwise the API may query tables that don't exist yet.

Use a separate init container or an entrypoint script:

```bash
# As part of a deploy script
echo "Running migrations..."
docker run --rm \
  --env DATABASE_URL="${DATABASE_URL}" \
  ghcr.io/your-org/api:${IMAGE_TAG} \
  pnpm --filter @pm/db migrate:deploy

echo "Applying RLS policies..."
docker run --rm \
  --env DATABASE_URL="${DATABASE_URL}" \
  postgres:16-alpine \
  psql "${DATABASE_URL}" -f /scripts/rls-policies.sql

echo "Starting services..."
docker compose up -d api worker web
```

In Kubernetes, use an `initContainer` on the API deployment that runs `migrate:deploy`.

## Health Check Endpoints

Two health endpoints are available:

### `GET /health`

Liveness check. Always returns `200 { "status": "ok" }` if the process is running.

Use this for Docker `HEALTHCHECK` and Kubernetes liveness probes.

```yaml
# Dockerfile healthcheck
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -sf http://localhost:3000/health || exit 1
```

### `GET /health/ready`

Readiness check. Pings PostgreSQL (`SELECT 1`) and Redis (`PING`). Returns `200` if both are reachable, `503` otherwise.

Use this for Kubernetes readiness probes and load balancer health checks. Do not send traffic to a pod that returns `503` here.

```json
// Healthy response
{ "status": "ready", "checks": { "database": "ok", "redis": "ok" } }

// Unhealthy response (503)
{ "status": "not_ready", "checks": { "database": "error", "redis": "ok" } }
```

## Rolling Deploy Strategy

To deploy without downtime:

1. **Build new images** — CI builds and pushes `api:<sha>`, `worker:<sha>`, `web:<sha>` to GHCR on every push to `main`

2. **Run migrations** — run `migrate:deploy` against production DB before updating the API. Migrations must be backwards-compatible with the currently running API version (use the expand–contract pattern for breaking changes — see `database/migrations.md`)

3. **Update worker first** — stop old workers, start new workers. In-flight jobs drain gracefully (SIGTERM → `worker.close()`). This prevents old workers from processing jobs with new schemas

4. **Update API with rolling restart** — if running multiple API instances (Docker Swarm `replicas`, Kubernetes Deployment), use rolling updates so at least one instance is always healthy

5. **Update web** — static assets are cache-busted by content hash. Nginx serves the new `index.html` for all new requests. Existing users with open tabs get the old SPA until they reload

### Rollback

If the new API version has issues:
1. Stop the new API containers
2. Start the previous image tag
3. If a migration was applied, run the `down` migration (only if it was designed to be reversible)

Keep the previous two image tags available in GHCR before cleaning up.

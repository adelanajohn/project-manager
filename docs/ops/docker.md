# Docker & Local Development

## Local Dev (Docker Compose)

Start just the infrastructure (recommended for active development):

```bash
# Start Postgres + Redis
docker compose up -d postgres redis

# Run app locally with hot reload
pnpm dev
```

Or start everything in Docker:

```bash
docker compose up
```

Services:

| Service | Port | Notes |
|---------|------|-------|
| postgres | 5432 | Data persisted in `postgres_data` volume |
| redis | 6379 | AOF persistence in `redis_data` volume |
| api | 3000 | Hot reload via `tsx watch` |
| worker | — | BullMQ processors |
| web | 5173 | Vite HMR |

## Health Checks

```bash
# API liveness
curl http://localhost:3000/health

# API readiness (checks DB + Redis)
curl http://localhost:3000/health/ready
```

## Container Images

Images are built and pushed to GitHub Container Registry by CI on every merge to `main`.

| Image | Tag |
|-------|-----|
| `ghcr.io/<owner>/project-manager/api` | `latest`, `<sha>` |
| `ghcr.io/<owner>/project-manager/worker` | `latest`, `<sha>` |
| `ghcr.io/<owner>/project-manager/web` | `latest`, `<sha>` |

## Building Images Locally

```bash
# API
docker build -f apps/api/Dockerfile -t pm-api .

# Worker
docker build -f apps/worker/Dockerfile -t pm-worker .

# Web (pass build args for env vars)
docker build \
  --build-arg VITE_API_URL=http://localhost:3000 \
  --build-arg VITE_WS_URL=ws://localhost:3000 \
  -f apps/web/Dockerfile \
  -t pm-web .
```

## Volumes

| Volume | Contents |
|--------|----------|
| `postgres_data` | PostgreSQL data directory |
| `redis_data` | Redis AOF persistence files |

To reset the database entirely:

```bash
docker compose down -v  # removes volumes
docker compose up -d postgres redis
pnpm --filter @pm/db migrate
pnpm --filter @pm/db seed
```

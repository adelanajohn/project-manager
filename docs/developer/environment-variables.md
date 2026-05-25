# Environment Variables

## apps/api

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ✅ | — | Redis connection string |
| `JWT_PRIVATE_KEY` | ✅ | — | RS256 private key, base64-encoded |
| `JWT_PUBLIC_KEY` | ✅ | — | RS256 public key, base64-encoded |
| `JWT_ACCESS_EXPIRY` | ❌ | `15m` | Access token TTL (ms/zeit format) |
| `JWT_REFRESH_EXPIRY` | ❌ | `7d` | Refresh token TTL |
| `S3_BUCKET` | ❌ | — | S3 bucket name for attachments |
| `S3_REGION` | ❌ | `us-east-1` | AWS region |
| `S3_ACCESS_KEY_ID` | ❌ | — | AWS access key ID |
| `S3_SECRET_ACCESS_KEY` | ❌ | — | AWS secret access key |
| `S3_ENDPOINT` | ❌ | — | Custom endpoint (for MinIO, R2, etc.) |
| `SMTP_HOST` | ❌ | — | SMTP server hostname |
| `SMTP_PORT` | ❌ | `587` | SMTP port |
| `SMTP_USER` | ❌ | — | SMTP username |
| `SMTP_PASS` | ❌ | — | SMTP password or API key |
| `SMTP_FROM` | ❌ | `noreply@example.com` | From address for outgoing email |
| `NODE_ENV` | ❌ | `development` | `development`, `production`, or `test` |
| `PORT` | ❌ | `3000` | HTTP port |
| `APP_URL` | ❌ | `http://localhost:3000` | Public app URL (used in email links) |
| `CORS_ORIGINS` | ❌ | `http://localhost:5173` | Comma-separated allowed CORS origins |
| `SENTRY_DSN` | ❌ | — | Sentry DSN for error tracking |
| `STRIPE_SECRET_KEY` | ❌ | — | Stripe secret key for billing |
| `STRIPE_WEBHOOK_SECRET` | ❌ | — | Stripe webhook signing secret |

## apps/worker

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ✅ | — | Redis connection string |
| `SMTP_HOST` | ❌ | — | SMTP server hostname |
| `SMTP_PORT` | ❌ | `587` | SMTP port |
| `SMTP_USER` | ❌ | — | SMTP username |
| `SMTP_PASS` | ❌ | — | SMTP password or API key |
| `SMTP_FROM` | ❌ | `noreply@example.com` | From address |
| `NODE_ENV` | ❌ | `development` | Runtime environment |

## apps/web

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ✅ | `http://localhost:3000` | API base URL (must be accessible from browser) |
| `VITE_WS_URL` | ✅ | `ws://localhost:3000` | WebSocket URL |

All `VITE_` prefixed variables are inlined at build time. **Do not put secrets here.**

## GitHub Actions Secrets

For CI/CD to work, add these repository secrets:

| Secret | Description |
|--------|-------------|
| `JWT_PRIVATE_KEY_TEST` | Base64-encoded RS256 private key for test runs |
| `JWT_PUBLIC_KEY_TEST` | Base64-encoded RS256 public key for test runs |

And these repository variables:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Production API URL for web build |
| `VITE_WS_URL` | Production WebSocket URL for web build |

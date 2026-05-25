# Security Architecture Overview

## Authentication: JWT RS256

Access tokens are signed with a 2048-bit RSA private key (`RS256` algorithm). The private key lives only in the API; the public key is distributed to any service that needs to verify tokens.

Both keys are stored base64-encoded in environment variables:
```
JWT_PRIVATE_KEY=<base64(pem)>
JWT_PUBLIC_KEY=<base64(pem)>
```

The API decodes them at startup:

```typescript
const privateKey = Buffer.from(env.JWT_PRIVATE_KEY, 'base64').toString('utf-8');
const publicKey  = Buffer.from(env.JWT_PUBLIC_KEY, 'base64').toString('utf-8');
```

Access tokens expire in 15 minutes (`JWT_ACCESS_EXPIRY=15m`). Refresh tokens expire in 7 days.

### JWT payload

```typescript
interface JwtPayload {
  sub: string;           // user ID
  orgId: string;         // current org context
  role: TenantRole;      // tenant role for RBAC
  platformRole?: string; // set only for platform admins
  sessionId: string;     // links to sessions table row
  iat: number;
  exp: number;
}
```

### Token blacklist

On logout or session revocation, the `sessionId` is written to Redis with a 1-hour TTL:

```
SET blacklist:<sessionId> 1 EX 3600
```

The auth plugin checks this on every request before the route handler fires. This gives instant revocation without waiting for the 15-minute expiry.

## Refresh Token Rotation with Theft Detection

Each refresh token is associated with a **token family** (a UUID generated at first login). When a refresh token is used:

1. The old session row is revoked (`revokedAt = now()`)
2. A new session row is created with the same `tokenFamily`, a new `sessionId`, and a new hashed refresh token

If a refresh token is presented that belongs to an already-revoked session:

```typescript
// Possible theft — someone reused an old token
await prisma.session.updateMany({
  where: { tokenFamily: session.tokenFamily },
  data: { revokedAt: new Date() },
});
throw new Error('Token reuse detected. All sessions invalidated.');
```

**All sessions in that family are revoked**, forcing the legitimate user to log in again. This is the RFC-recommended response to refresh token theft.

## Account Lockout

Failed login attempts are tracked in Redis with a TTL:

```
INCR attempts:<email>
EXPIRE attempts:<email> 900   # 15 minutes

# After 5 failures:
SET lockout:<email> 1 EX 900
```

At login, the lockout key is checked before the password is compared. After 15 minutes of no activity, the lockout clears automatically. The lockout message is deliberately generic (`Account locked`) to avoid leaking information about whether the email exists.

## Three-Layer Tenant Isolation

Multi-tenant isolation is enforced at three independent levels. An attacker must bypass all three to access another tenant's data.

### Layer 1: JWT claims

Every access token embeds the `orgId`. The RLS plugin creates a scoped Prisma client immediately after authentication:

```typescript
// apps/api/src/plugins/rls.ts
request.db = withRls(prisma, {
  orgId: payload.orgId,
  userId: payload.sub,
  role: payload.role,
});
```

Route handlers use `request.db` for all queries, never the bare `prisma` import (which would bypass RLS session variables).

### Layer 2: Prisma middleware (application-level filter)

`withRls` wraps every Prisma operation in a transaction that first calls `set_config` to inject PostgreSQL session variables:

```sql
SELECT set_config('app.current_org_id', $1, true),
       set_config('app.current_user_id', $2, true),
       set_config('app.current_role',    $3, true)
```

The `true` parameter makes these settings transaction-local only.

### Layer 3: PostgreSQL Row-Level Security

RLS policies on every sensitive table enforce org isolation at the database level. Even if layers 1 and 2 are bypassed (e.g., a raw SQL injection), the database will not return rows for the wrong org.

See `security/rls.md` and `database/rls-policies.md` for full policy definitions.

## RBAC with `can()`

The `can()` function in `packages/shared/src/permissions.ts` is the single source of truth for permission checks.

```typescript
import { can } from '@pm/shared';

// In a route handler
if (!can({ tenantRole: request.jwtPayload.role }, 'create:project')) {
  reply.status(403).send({ error: { code: 'FORBIDDEN', message: '...' } });
  return;
}
```

Role hierarchy (least to most privileged):
- `tenant_guest` — can create and edit own issues, comment
- `tenant_viewer` — read-only access to issues and analytics
- `tenant_member` — create, edit own issues, comment, view analytics
- `tenant_manager` — full issue management, sprint management, project settings
- `tenant_admin` — all of the above + member management, billing, audit logs
- `platform_admin` — bypasses all tenant checks; has every permission

Project-level roles (`project_lead`, `project_viewer`) add or restrict permissions within a project on top of the tenant role.

## OWASP Top 10 Mitigations

| Risk | Mitigation |
|------|------------|
| A01 Broken Access Control | Three-layer tenant isolation, RBAC `can()` on all mutations |
| A02 Cryptographic Failures | RS256 JWT, bcrypt passwords (cost 12), `pgcrypto` for API key hashing |
| A03 Injection | Prisma parameterised queries; `set_config` uses parameterised `$executeRawUnsafe` with no string interpolation |
| A04 Insecure Design | Refresh token family rotation, account lockout, email enumeration prevention in `forgotPassword` |
| A05 Security Misconfiguration | Helmet CSP headers, CORS allowlist, Zod env validation at startup |
| A06 Vulnerable Components | Dependabot / `pnpm audit` in CI |
| A07 Auth Failures | Token blacklist, lockout, session revocation on password reset |
| A08 Software Integrity | Lockfile (`pnpm-lock.yaml`) committed, pinned exact dependency versions |
| A09 Logging Failures | Pino structured logging, `correlationId` on every log line, audit trail via BullMQ `auditQueue` |
| A10 SSRF | Webhook URLs validated against allowlist before dispatch in webhooks processor |

## Rate Limiting

Global rate limiting is provided by `@fastify/rate-limit` with Redis as the store:

```typescript
max: 200,
timeWindow: '1 minute',
keyGenerator: (req) => req.jwtPayload?.sub || req.ip,
```

Authenticated users are limited by user ID (not IP) so shared corporate NATs don't cause false positives. Unauthenticated requests are limited by IP.

Exceeded limits return `429` with error code `RATE_LIMITED`.

Specific sensitive endpoints (login, signup, forgot-password) have additional per-endpoint rate limits enforced in the route handler using the same Redis key pattern as the lockout mechanism.

## Security Headers

`@fastify/helmet` sets the following on all responses:

- `Content-Security-Policy` — restricts scripts, styles, images, and connections to trusted sources
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security` (in production)
- `X-XSS-Protection: 0` (disabled — modern browsers use CSP instead)

The CSP allows WebSocket connections (`ws:`, `wss:`) in `connect-src` to support Socket.IO.

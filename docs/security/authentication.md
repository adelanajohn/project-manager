# Authentication

## Token Strategy

The app uses a **dual-token** pattern:

| Token | Expiry | Storage | Purpose |
|-------|--------|---------|---------|
| Access token (JWT RS256) | 15 minutes | In-memory (Zustand) | Authenticate every API request |
| Refresh token (opaque UUID) | 7 days | HttpOnly cookie | Obtain new access tokens |

Access tokens are **never stored in localStorage**. They live in memory only and are lost on page refresh. On any 401, the client transparently calls `/auth/refresh` using the HttpOnly cookie to get a new access token.

## Refresh Token Rotation

Each use of a refresh token:
1. Validates the token against its bcrypt hash in the `sessions` table
2. Revokes the old session
3. Issues a new refresh token + new session with the same `tokenFamily`

**Theft detection**: If a refresh token is used after it has already been rotated (reuse detected), the entire token family is invalidated. All devices are logged out, preventing an attacker from using a stolen refresh token.

## Session Management

Sessions are stored in the `sessions` table with:
- `refreshTokenHash` — bcrypt hash, never plain text
- `tokenFamily` — groups all rotations of a session together
- `deviceInfo` — user agent string for the sessions UI
- `ipAddress` — for display and audit
- `expiresAt` — hard expiry regardless of rotation
- `revokedAt` — set on logout, token reuse, or admin revocation

Users can view and revoke sessions from Settings → Security.

## Account Lockout

After 5 consecutive failed login attempts for an email address:
- A `lockout:<email>` key is set in Redis with a 15-minute TTL
- All login attempts return 429 (Too Many Requests) during lockout
- Successful login clears the attempt counter

## Password Policy

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- bcrypt with cost factor 12

## Cookie Security

Refresh token cookie attributes:
```
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800
```

- `HttpOnly` — not accessible from JavaScript
- `Secure` — only sent over HTTPS in production
- `SameSite=Strict` — CSRF protection
- `Path=/api/v1/auth` — only sent to auth endpoints

## Token Blacklist

When a session is revoked (logout, admin force-logout, password reset), the `sessionId` is added to a Redis blacklist with a TTL matching the access token expiry. Every authenticated request checks the blacklist.

## Email Verification

New accounts must verify their email before they can access the app. A verification link (signed UUID stored in Redis with 24-hour TTL) is sent on signup.

## Password Reset

1. User requests reset → time-limited token (UUID, 1-hour TTL in Redis) sent via email
2. User submits new password with token → password updated, all sessions revoked
3. Token deleted from Redis on use (single-use)

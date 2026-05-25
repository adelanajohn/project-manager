# REST API Reference

## Base URL

```
https://api.example.com
```

In development: `http://localhost:3000`

All endpoints are versioned under `/api/v1/`.

## Authentication

The API uses Bearer token authentication with RS256-signed JWTs.

Include the token in every request:

```
Authorization: Bearer <access_token>
```

### Obtaining a token

```bash
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "user@example.com", "password": "Password123!" }'
```

Response:

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
    "sessionId": "a1b2c3d4-...",
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "fullName": "Alice Smith"
    }
  },
  "meta": { "requestId": "req_xyz789", "timestamp": "2024-12-01T10:00:00.000Z" },
  "error": null
}
```

Access tokens expire after **15 minutes**. Use the refresh token to get a new access token without requiring the user to log in again.

### Refreshing a token

```bash
curl -X POST https://api.example.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "<refresh_token>", "sessionId": "<session_id>" }'
```

### Using an API Key

Generate a personal API key in Settings → API Keys. API keys do not expire by default (you can set an optional expiry).

```bash
curl -X GET https://api.example.com/api/v1/auth/me \
  -H "Authorization: Bearer pmk_<your-api-key>"
```

API keys go through the same authentication path as JWT tokens.

## Standard Response Envelope

Every response has this shape:

```typescript
{
  data: T | null;       // the response payload
  error: {              // null on success
    code: string;       // machine-readable error code
    message: string;    // human-readable message
    details?: unknown;  // validation error details
  } | null;
  meta: {
    requestId: string;  // correlationId for log tracing
    timestamp: string;  // ISO 8601
    nextCursor?: string | null;  // pagination cursor (list endpoints)
    hasMore?: boolean;           // pagination flag (list endpoints)
  };
}
```

Success response example:

```json
{
  "data": { "id": "iss_abc123", "title": "Fix login bug", "issueKey": "ENG-42" },
  "error": null,
  "meta": { "requestId": "req_xyz789", "timestamp": "2024-12-01T10:00:00.000Z" }
}
```

Error response example:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "/title", "message": "String must contain at least 1 character(s)" }]
  },
  "meta": { "requestId": "req_xyz789", "timestamp": "2024-12-01T10:00:00.000Z" }
}
```

## Error Codes

| HTTP Status | Error Code | Meaning |
|-------------|------------|---------|
| 400 | `VALIDATION_ERROR` | Request body or query params failed Zod schema validation |
| 401 | `UNAUTHORIZED` | Missing or invalid Bearer token |
| 401 | `TOKEN_EXPIRED` | Session was revoked (logout, password reset, theft detection) |
| 403 | `FORBIDDEN` | Authenticated but insufficient permissions for this action |
| 404 | `NOT_FOUND` | Resource does not exist or is not visible to this user |
| 409 | `CONFLICT` | Unique constraint violation (e.g., duplicate email) |
| 429 | `RATE_LIMITED` | Exceeded rate limit (200 req/min per user, or per IP for unauthenticated) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## Cursor Pagination

List endpoints use **cursor-based pagination** — not offset pagination. This is more efficient on large tables and provides stable results even when items are added or reordered.

### Requesting a page

```bash
# First page (no cursor)
curl "https://api.example.com/api/v1/projects/proj-id/issues?limit=25" \
  -H "Authorization: Bearer $TOKEN"

# Next page (pass cursor from previous response)
curl "https://api.example.com/api/v1/projects/proj-id/issues?limit=25&cursor=iss_lastId" \
  -H "Authorization: Bearer $TOKEN"
```

### Pagination response fields

```json
{
  "data": [ /* array of items */ ],
  "meta": {
    "nextCursor": "iss_abc999",  // pass this as ?cursor= for the next page; null if no more pages
    "hasMore": true
  }
}
```

Iterate until `hasMore` is `false`.

## Rate Limits

| Limit | Value |
|-------|-------|
| Global | 200 requests per minute per user |
| Unauthenticated | 200 requests per minute per IP |
| Login endpoint | 5 failed attempts triggers a 15-minute lockout per email |

Rate limit headers are not included in responses currently. Monitor for `429 RATE_LIMITED` responses. If you are building an integration, implement exponential backoff with jitter.

## Example Requests

### Create an issue

```bash
curl -X POST "https://api.example.com/api/v1/projects/proj-uuid/issues" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User cannot reset password",
    "type": "bug",
    "priority": "high",
    "description": {
      "type": "doc",
      "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Steps to reproduce..." }] }]
    }
  }'
```

### List issues with filters

```bash
curl "https://api.example.com/api/v1/projects/proj-uuid/issues?priority=high&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### Update an issue

```bash
curl -X PATCH "https://api.example.com/api/v1/issues/issue-uuid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "priority": "urgent", "assigneeId": "user-uuid" }'
```

### Create a comment

```bash
curl -X POST "https://api.example.com/api/v1/issues/issue-uuid/comments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "type": "doc",
      "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Confirmed on v2.3" }] }]
    }
  }'
```

### Start a sprint

```bash
curl -X POST "https://api.example.com/api/v1/sprints/sprint-uuid/start" \
  -H "Authorization: Bearer $TOKEN"
```

### Search

```bash
curl "https://api.example.com/api/v1/search?q=login+bug&type=issue&projectId=proj-uuid" \
  -H "Authorization: Bearer $TOKEN"
```

## OpenAPI / Swagger

Interactive API documentation is available at:

```
http://localhost:3000/docs
```

(Development only. Not exposed in production.)

The documentation is auto-generated from the Zod schemas via `zod-to-json-schema` and registered on each route. You can also export the OpenAPI spec:

```bash
curl http://localhost:3000/docs/json > openapi.json
```

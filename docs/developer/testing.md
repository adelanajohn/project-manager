# Testing

## Test Stack

| Layer | Tool | Location |
|-------|------|----------|
| Unit tests | Vitest | `packages/shared/src/*.test.ts` |
| Integration tests | Vitest + `fastify.inject` | `apps/api/tests/*.test.ts` |
| End-to-end tests | Playwright | `apps/web/e2e/` (planned) |

There are no real HTTP requests in integration tests. Fastify's `inject` method fires requests directly through the routing layer without opening a socket, making tests fast and side-effect-free at the network level. The database and Redis are real — integration tests run against a live PostgreSQL and Redis (spun up by the CI `services` block or locally via Docker).

## Running Tests

### All tests

```bash
pnpm test
```

Turbo runs `test` across all packages that have a `test` script, in dependency order.

### Specific package

```bash
# Unit tests for shared package
pnpm --filter @pm/shared test

# Integration tests for the API
pnpm --filter @pm/api test

# Watch mode
pnpm --filter @pm/api test -- --watch
```

### With coverage

```bash
pnpm --filter @pm/api test -- --coverage
```

Coverage output is written to `apps/api/coverage/`.

### Before running integration tests locally

You need a running PostgreSQL and Redis. The easiest way:

```bash
docker compose up postgres redis -d
```

Then apply migrations:

```bash
DATABASE_URL=postgresql://app_user:password@localhost:5432/pm_db_test \
  pnpm --filter @pm/db migrate:deploy
```

Set the required environment variables (copy from `apps/api/.env.example`):

```bash
export DATABASE_URL=postgresql://app_user:password@localhost:5432/pm_db_test
export REDIS_URL=redis://localhost:6379
export JWT_PRIVATE_KEY=<base64-encoded-rs256-private-key>
export JWT_PUBLIC_KEY=<base64-encoded-rs256-public-key>
export NODE_ENV=test
export PORT=3000
export APP_URL=http://localhost:3000
export CORS_ORIGINS=http://localhost:5173
```

## Test Helpers

All helpers are in `apps/api/tests/helpers.ts`.

### `getApp(): Promise<FastifyInstance>`

Returns a singleton Fastify app instance. The app is built once per test file and reused across tests. Call `closeApp()` in `afterAll`.

```typescript
import { getApp, closeApp } from './helpers';

let app: FastifyInstance;
beforeAll(async () => { app = await getApp(); });
afterAll(closeApp);
```

### `createTestUser(overrides?)`

Creates a user in the database (with `bcrypt` at cost 4 for speed) and optionally adds them to an org.

```typescript
const { user, email, password } = await createTestUser({
  role: 'tenant_admin',
  orgId: org.id,
});
```

| Option | Default | Description |
|--------|---------|-------------|
| `email` | random UUID email | Override for deterministic tests |
| `role` | `'tenant_member'` | Org membership role |
| `platformRole` | `null` | Set to `'platform_admin'` for admin tests |
| `orgId` | none | If provided, creates an `OrgMember` record |

### `createTestOrg(nameSuffix?)`

Creates an organization with a unique slug.

```typescript
const org = await createTestOrg('payments-team');
```

### `loginAs(app, email, password): Promise<string>`

Calls `POST /api/v1/auth/login` via `app.inject` and returns the access token. Throws if login fails.

```typescript
const token = await loginAs(app, email, password);
```

### `authRequest(app, token)`

Returns an object with `get`, `post`, `patch`, `delete` methods that automatically set the `Authorization: Bearer <token>` header.

```typescript
const client = authRequest(app, token);

const res = await client.get(`/api/v1/projects/${projectId}/issues`);
expect(res.statusCode).toBe(200);

const createRes = await client.post('/api/v1/orgs', { name: 'Acme', slug: 'acme' });
expect(createRes.statusCode).toBe(201);
```

### `cleanupOrg(orgId)` / `cleanupUser(userId)`

Delete test data after tests. Since org deletion cascades to all child records via `onDelete: Cascade`, cleaning up the org is usually sufficient.

## Integration Test Patterns

### Basic test structure

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getApp, closeApp, createTestUser, createTestOrg, loginAs, authRequest, cleanupOrg } from './helpers';

describe('Issues API', () => {
  let app: FastifyInstance;
  let orgId: string;
  let token: string;

  beforeAll(async () => {
    app = await getApp();
    const org = await createTestOrg('issues-test');
    orgId = org.id;
    const { email, password } = await createTestUser({ role: 'tenant_admin', orgId });
    token = await loginAs(app, email, password);
  });

  afterAll(async () => {
    await cleanupOrg(orgId);
    await closeApp();
  });

  it('returns 401 without a token', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/orgs/${orgId}/issues` });
    expect(res.statusCode).toBe(401);
  });

  it('creates an issue and returns 201', async () => {
    const client = authRequest(app, token);
    // First create a project
    const projectRes = await client.post(`/api/v1/orgs/${orgId}/projects`, {
      name: 'Test Project',
      identifier: 'TST',
      type: 'scrum',
    });
    expect(projectRes.statusCode).toBe(201);
    const projectId = JSON.parse(projectRes.body).data.id;

    const res = await client.post(`/api/v1/projects/${projectId}/issues`, {
      title: 'Fix the login bug',
      type: 'bug',
      priority: 'high',
    });
    expect(res.statusCode).toBe(201);

    const body = JSON.parse(res.body);
    expect(body.data.title).toBe('Fix the login bug');
    expect(body.data.issueKey).toMatch(/^TST-\d+$/);
    expect(body.error).toBeNull();
  });
});
```

### Testing error cases

```typescript
it('returns 403 when a viewer tries to delete an issue', async () => {
  const { email, password } = await createTestUser({ role: 'tenant_viewer', orgId });
  const viewerToken = await loginAs(app, email, password);
  const viewerClient = authRequest(app, viewerToken);

  const res = await viewerClient.delete(`/api/v1/issues/${issueId}`);
  expect(res.statusCode).toBe(403);
  expect(JSON.parse(res.body).error.code).toBe('FORBIDDEN');
});
```

### Testing the response envelope

All API responses follow the standard envelope. Always assert both `data` and `error`:

```typescript
const body = JSON.parse(res.body);
expect(body.data).toBeDefined();
expect(body.error).toBeNull();
expect(body.meta.requestId).toBeDefined();
```

## CI Test Matrix

The CI workflow (`.github/workflows/ci.yml`) runs three jobs:

### `lint-typecheck`

Runs on every push and PR. No database needed.
- `pnpm typecheck` — TypeScript compilation check across all packages
- `pnpm lint` — ESLint across all packages

### `test` (unit)

Depends on `lint-typecheck`. Runs `pnpm test` which executes Vitest in all packages. The shared package permission tests run here.

### `integration`

Depends on `lint-typecheck`. Runs in parallel with `test`.

Spins up two GitHub Actions services:
- `postgres:16-alpine` on port 5432
- `redis:7-alpine` on port 6379

Then:
1. Installs deps
2. Generates Prisma client
3. Builds `@pm/shared`
4. Runs `pnpm --filter @pm/db migrate:deploy`
5. Runs `pnpm --filter @pm/api test`

### `build`

Only runs on pushes to `main` and depends on both `test` and `integration` passing. Builds Docker images for `api`, `worker`, and `web` and pushes to GitHub Container Registry.

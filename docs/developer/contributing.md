# Contributing Guide

## Branch Naming

All branches must follow this pattern: `<type>/<short-description>`.

| Prefix | When to use |
|--------|-------------|
| `feat/` | New feature or capability |
| `fix/` | Bug fix |
| `chore/` | Tooling, dependency updates, CI changes |
| `docs/` | Documentation only changes |
| `refactor/` | Code change that neither fixes a bug nor adds a feature |
| `test/` | Adding or improving tests |

Examples:
```
feat/gantt-chart-zoom
fix/sprint-completion-null-pointer
chore/bump-prisma-5-17
docs/websocket-event-catalog
```

## Conventional Commits

Commit messages are validated by `commitlint` (configured in `commitlint.config.js`) and enforced via the `commit-msg` Husky hook.

Format:
```
<type>(<optional scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE / closes #123]
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`, `revert`

Good examples:
```
feat(issues): add bulk status update endpoint
fix(auth): prevent refresh token reuse after family rotation
chore(deps): upgrade bullmq to 5.10
docs(api): document cursor pagination pattern
refactor(db): extract withRls helper to packages/db
```

Bad examples (rejected by commitlint):
```
updated stuff          # no type
Feat: add thing        # capitalised type
feat: Add thing.       # sentence case + trailing period
```

## Pre-commit Hooks

Husky runs `lint-staged` before every commit. It will:
- Run `eslint --fix` on any staged `.ts` / `.tsx` files
- Run `prettier --write` on staged TypeScript, JSON, Markdown, and YAML files

If lint-staged exits with errors, the commit is aborted. Fix the reported issues and re-stage.

## Pull Request Process

1. **Open as Draft** — push your branch and open a draft PR immediately. This triggers CI and lets teammates comment early without implying the work is done.

2. **Self-review checklist before marking ready:**
   - [ ] All CI checks pass (lint, typecheck, unit tests, integration tests)
   - [ ] New code has corresponding tests
   - [ ] No `console.log` left in source (ESLint rule `no-console` is set to `error`)
   - [ ] Sensitive fields are redacted in Pino logger config if new fields were added
   - [ ] Any new environment variable is added to `apps/api/.env.example` and `docs/ops/deployment.md`
   - [ ] Database schema changes have a migration (see `database/migrations.md`)

3. **Review** — at least one approval is required. Reviewers focus on correctness, security, and test coverage rather than style (Prettier handles that).

4. **Squash merge** — all PRs are squash-merged into `main`. The squash commit message must follow Conventional Commits format. GitHub will pre-fill it from the PR title, so keep PR titles in the right format.

## Adding a New API Endpoint

Here is the full path from idea to working endpoint.

### 1. Define the Zod schema in `packages/shared`

```typescript
// packages/shared/src/schemas/milestone.schema.ts
import { z } from 'zod';

export const CreateMilestoneSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

export type CreateMilestoneInput = z.infer<typeof CreateMilestoneSchema>;
```

Export it from `packages/shared/src/index.ts`.

### 2. Build the service in `apps/api/src/services`

```typescript
// apps/api/src/services/milestone.service.ts
import { prisma } from '@pm/db';
import type { CreateMilestoneInput } from '@pm/shared';

export const milestoneService = {
  async create(projectId: string, orgId: string, input: CreateMilestoneInput) {
    return prisma.milestone.create({
      data: { projectId, ...input },
    });
  },
  async list(projectId: string) {
    return prisma.milestone.findMany({ where: { projectId }, orderBy: { dueDate: 'asc' } });
  },
};
```

Services use the bare `prisma` import; the RLS-scoped `request.db` is used in routes.

### 3. Register the route in `apps/api/src/routes`

```typescript
// apps/api/src/routes/milestones.ts
import type { FastifyInstance } from 'fastify';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CreateMilestoneSchema } from '@pm/shared';
import { milestoneService } from '../services/milestone.service.js';

export default async function milestoneRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/milestones', {
    preHandler: [app.authenticate],
    schema: { tags: ['Milestones'], summary: 'List milestones', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const data = await milestoneService.list(projectId);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  app.post('/projects/:projectId/milestones', {
    preHandler: [app.authenticate],
    schema: {
      tags: ['Milestones'],
      summary: 'Create milestone',
      body: zodToJsonSchema(CreateMilestoneSchema),
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = CreateMilestoneSchema.parse(request.body);
    const data = await milestoneService.create(projectId, orgId, input);
    reply.status(201).send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}
```

### 4. Register the route in `apps/api/src/app.ts`

```typescript
const { default: milestoneRoutes } = await import('./routes/milestones.js');
await app.register(milestoneRoutes, { prefix: '/api/v1' });
```

### 5. Write an integration test

See `apps/api/tests/helpers.ts` for the `createTestUser`, `createTestOrg`, and `authRequest` utilities. Follow the pattern in existing test files.

## Adding a BullMQ Job

### 1. Add the queue to `apps/api/src/queues/index.ts`

```typescript
export const automationsQueue = new Queue('automations', { connection });
```

Add it to `allQueues` so it appears in Bull Board and admin metrics.

### 2. Create a processor in `apps/worker/src/processors`

```typescript
// apps/worker/src/processors/automations.processor.ts
import type { Job } from 'bullmq';
import { prisma } from '@pm/db';
import pino from 'pino';

const logger = pino({ level: 'info' });

export async function automationsProcessor(job: Job) {
  const log = logger.child({ correlationId: job.data.correlationId, jobId: job.id });
  log.info('Processing automation job');
  // ... logic
}
```

Always pull `correlationId` from `job.data` and pass it to the child logger.

### 3. Register the worker in `apps/worker/src/index.ts`

Add to `QUEUE_CONFIGS`:
```typescript
{ name: 'automations', processor: automationsProcessor, concurrency: 5, attempts: 3 },
```

### 4. Enqueue from an API handler or service

```typescript
import { automationsQueue } from '../queues/index.js';

await automationsQueue.add('trigger', {
  correlationId: request.correlationId,
  orgId,
  ruleId,
  issueId,
});
```

## Adding a UI Component to `packages/ui`

### 1. Create the component file

```typescript
// packages/ui/src/components/Badge.tsx
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary-500/10 text-primary-400',
        destructive: 'bg-accent-rose/10 text-accent-rose',
        outline: 'border border-dark-border text-dark-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

### 2. Export from the package index

```typescript
// packages/ui/src/index.ts
export { Badge } from './components/Badge';
```

### 3. Consume in the web app

```typescript
import { Badge } from '@pm/ui';
```

No build step is needed during development — the web app's Vite config resolves the package source directly.

## ESLint + Prettier Config Overview

Config lives in `packages/config/eslint-preset.js` and `packages/config/prettier.config.js` and is shared across all apps and packages.

### ESLint rules that matter most

- `@typescript-eslint/no-unused-vars` — error; prefix with `_` to suppress (e.g., `_event`)
- `@typescript-eslint/no-explicit-any` — warning; avoid `any`, use `unknown` with type guards
- `no-console` — error; use the Pino logger (`request.log` in routes, `logger` in services/workers)
- `import/order` — error; groups must be ordered: builtins → externals → internals → parent → sibling; each group separated by a blank line, sorted alphabetically

### Prettier settings

```js
semi: true          // always semicolons
singleQuote: true   // 'like this' not "like this"
trailingComma: 'es5' // trailing commas in objects and arrays
printWidth: 100     // wrap at 100 chars
tabWidth: 2         // 2-space indent
```

Run `pnpm format` to reformat everything. CI does not auto-format — format before committing or Prettier will fail in lint-staged.

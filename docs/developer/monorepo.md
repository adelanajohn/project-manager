# Monorepo

## pnpm Workspaces + Turborepo

The repository is a pnpm workspace (`pnpm-workspace.yaml`) with Turborepo (`turbo.json`) layered on top.

- **pnpm workspaces** handles dependency hoisting, symlinks between packages, and running scripts across packages
- **Turborepo** handles task orchestration: caching, dependency-aware execution order, and parallel execution

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// turbo.json (simplified)
{
  "tasks": {
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev":       { "cache": false, "persistent": true },
    "lint":      { "outputs": [] },
    "typecheck": { "dependsOn": ["^build"], "outputs": [] },
    "test":      { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "clean":     { "cache": false }
  }
}
```

The `^build` syntax means "run the `build` task in all upstream dependencies first". This enforces correct build order automatically.

## Package Dependency Graph

```
@pm/config
    │
    └── (consumed by all packages for ESLint, Prettier, TS configs)

@pm/shared  ─────────────────────────────────────┐
    │    (Zod schemas, permissions, types)        │
    │                                             │
@pm/db  ──────────────────────────────────┐      │
    │    (Prisma client, withRls)          │      │
    │                                     ▼      ▼
    │                              apps/api    apps/worker
    │
    └──────────────────────────────► apps/web (types only, no db)

@pm/ui
    │   (React component library)
    └──────────────────────────────► apps/web
```

`apps/web` never imports from `@pm/db` — it has no direct database access. It uses types from `@pm/shared`.

## Build Order

Turborepo resolves the order automatically from `dependsOn: ["^build"]`, but understanding the intended order helps when debugging:

1. `@pm/config` — no dependencies, builds instantly (just re-exports config files)
2. `@pm/shared` — builds Zod schemas and TypeScript types to `dist/`
3. `@pm/db` — generates Prisma client, builds `withRls` and client helpers to `dist/`
4. `@pm/ui` — builds React components to `dist/`
5. `apps/api`, `apps/web`, `apps/worker` — built in parallel (they don't depend on each other)

## Running Commands

### All packages

```bash
# Start all dev servers in parallel
pnpm dev

# Build all packages in dependency order
pnpm build

# Lint everything
pnpm lint

# Type-check everything
pnpm typecheck

# Run all tests
pnpm test

# Format all files
pnpm format
```

### Specific package

Use `--filter` to target a single package:

```bash
# Run dev for the API only
pnpm --filter @pm/api dev

# Build only the db package
pnpm --filter @pm/db build

# Run tests for the shared package in watch mode
pnpm --filter @pm/shared test -- --watch

# Generate Prisma client
pnpm --filter @pm/db generate
```

### Filtering by directory

You can also filter by path:

```bash
pnpm --filter "./apps/web..." dev   # web + its deps
```

### Running a command in a package directory

```bash
pnpm --filter @pm/db exec prisma migrate dev
```

## Adding a New Package

1. Create the directory under `packages/` (or `apps/`):

```bash
mkdir packages/my-package
```

2. Create `packages/my-package/package.json`:

```json
{
  "name": "@pm/my-package",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "clean": "rimraf dist"
  },
  "devDependencies": {
    "@pm/config": "workspace:*",
    "typescript": "5.5.3"
  }
}
```

3. Create `packages/my-package/tsconfig.json`:

```json
{
  "extends": "@pm/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

4. Create `packages/my-package/src/index.ts` as the entry point.

5. Run `pnpm install` from the root to update the lockfile and create symlinks.

6. Add as a dependency in any consuming app:

```json
{
  "dependencies": {
    "@pm/my-package": "workspace:*"
  }
}
```

## Cache Strategy

Turborepo caches task outputs locally in `.turbo/`. On CI, remote caching is not currently configured (it's opt-in with a Turborepo account or self-hosted cache server).

Outputs are defined per task:

| Task | Cached outputs |
|------|----------------|
| `build` | `dist/**` |
| `test` | `coverage/**` |
| `lint` | nothing (side-effect free, result is the exit code) |

The `dev` task has `"cache": false` because it is a persistent long-running process.

To force a clean rebuild ignoring cache:

```bash
pnpm build -- --force
```

To clear local cache:

```bash
pnpm clean
```

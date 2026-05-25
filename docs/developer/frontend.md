# Frontend Architecture

## Overview

The web app (`apps/web`) is a React + Vite single-page application.

| Concern | Library |
|---------|---------|
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Client state | Zustand |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) |
| HTTP | Axios (`apps/web/src/lib/api.ts`) |
| Animation | Framer Motion |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Toasts | Sonner |
| Icons | Lucide React |
| UI components | `@pm/ui` (shared), local `src/components/ui/` |
| Tables | TanStack Table v8 |
| Virtual lists | TanStack Virtual |
| Charts | Recharts |
| Date formatting | date-fns |

## Directory Structure

```
apps/web/src/
├── App.tsx               # Router root + QueryClientProvider
├── main.tsx              # Vite entry point
├── lib/
│   ├── api.ts            # Axios instance + endpoints
│   ├── queryKeys.ts      # TanStack Query key factory
│   └── utils.ts          # cn(), formatDate(), etc.
├── stores/
│   ├── auth.store.ts     # useAuthStore — user, token, isAuthenticated
│   ├── ui.store.ts       # useUIStore — sidebar, theme, command palette
│   └── presence.store.ts # usePresenceStore — who is viewing each project
├── hooks/
│   └── useProjectSocket.ts # Socket.IO lifecycle hook
├── components/
│   ├── layout/           # AppShell, Sidebar, TopBar
│   ├── ui/               # Local UI primitives (Button, Input, Modal, etc.)
│   └── CommandPalette.tsx
└── pages/
    ├── auth/             # Login, Signup, ForgotPassword, ResetPassword
    ├── org/              # Dashboard, Members, Settings, Notifications
    ├── project/          # Board, Backlog, Roadmap, Issues, Sprints
    └── admin/            # Platform admin panel
```

## `queryKeys` Factory Pattern

All TanStack Query cache keys are defined in `apps/web/src/lib/queryKeys.ts`. Never write inline query key arrays — always use this factory.

```typescript
export const queryKeys = {
  issues: {
    list: (projectId: string, filters?: Record<string, unknown>) =>
      ['issues', projectId, filters] as const,
    detail: (issueId: string) => ['issues', 'detail', issueId] as const,
    comments: (issueId: string) => ['issues', issueId, 'comments'] as const,
  },
  sprints: {
    list: (projectId: string) => ['sprints', projectId] as const,
    burndown: (sprintId: string) => ['sprints', sprintId, 'burndown'] as const,
  },
  // ... see full list in queryKeys.ts
};
```

Benefits:
- Invalidations are type-safe: `qc.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) })` automatically invalidates all variants that start with `['issues', projectId]`
- Refactoring a key path only requires one change

## Optimistic Updates Pattern

Use `onMutate` / `onError` / `onSettled` in `useMutation` for operations that update list views (status change, priority change, rank reorder):

```typescript
const updateIssue = useMutation({
  mutationFn: (input: { issueId: string; data: UpdateIssueInput }) =>
    endpoints.issues.update(input.issueId, input.data),

  onMutate: async ({ issueId, data }) => {
    // 1. Cancel any in-flight queries to avoid overwriting our optimistic update
    await qc.cancelQueries({ queryKey: queryKeys.issues.list(projectId) });

    // 2. Snapshot the previous value
    const previous = qc.getQueryData(queryKeys.issues.list(projectId));

    // 3. Apply the optimistic update
    qc.setQueryData(queryKeys.issues.list(projectId), (old: Issue[] | undefined) =>
      old?.map((i) => (i.id === issueId ? { ...i, ...data } : i))
    );

    return { previous };
  },

  onError: (_err, _vars, context) => {
    // 4. Roll back to the snapshot on error
    if (context?.previous) {
      qc.setQueryData(queryKeys.issues.list(projectId), context.previous);
    }
    toast.error('Failed to update issue');
  },

  onSettled: () => {
    // 5. Always refetch after success or failure to sync with server truth
    qc.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
  },
});
```

## Store Overview

### `useAuthStore`

Persisted to `localStorage` under the key `pm-auth`. The access token is **not** persisted (only the user object is) to avoid storing JWTs in localStorage across sessions.

```typescript
const { user, accessToken, isAuthenticated, setUser, setAccessToken, logout } = useAuthStore();
```

The token refresh flow in `apps/web/src/lib/api.ts` calls `setAccessToken` after a successful refresh and `logout()` if the refresh fails (redirects to `/login`).

### `useUIStore`

Persisted to `localStorage` under `pm-ui`. Only `theme` and `sidebarOpen` survive page reloads.

```typescript
const { theme, sidebarOpen, commandPaletteOpen, toggleTheme, toggleSidebar, setCommandPaletteOpen } = useUIStore();
```

`setTheme` and `toggleTheme` also call `document.documentElement.setAttribute('data-theme', ...)` to apply the CSS class used by Tailwind's dark mode (`darkMode: ['class', '[data-theme="dark"]']`).

### `usePresenceStore`

Not persisted — cleared on page reload. Tracks which users are currently viewing each project room.

```typescript
const { getUsersForProject, setUserPresent, setUserGone } = usePresenceStore();

// Get avatars to display in the project header
const presentUsers = getUsersForProject(projectId);
```

Updated automatically by `useProjectSocket` when `presence:join` / `presence:leave` events arrive.

## Component Conventions

- Prefer named exports over default exports for components
- Keep component files focused on a single responsibility; extract hooks when logic grows beyond ~30 lines
- Use `cn()` from `apps/web/src/lib/utils.ts` (wraps `clsx` + `tailwind-merge`) for conditional class names
- Co-locate component-specific hooks in the same directory as the component
- Accessibility: all interactive elements must have an accessible label or aria attribute

## Adding a New Page

1. Create the page component in `apps/web/src/pages/<section>/MyPage.tsx`
2. Add a route in `apps/web/src/App.tsx`:

```tsx
// Inside the router
<Route path="projects/:projectId/my-page" element={<MyPage />} />
```

3. If the page needs a query, add a key to `queryKeys.ts` and a call to `endpoints` in `api.ts`
4. Add a navigation link in the relevant sidebar section in `apps/web/src/components/layout/Sidebar.tsx`

## Adding a New API Call

1. Add the endpoint function to the relevant section of `apps/api/src/routes/...ts` (see `contributing.md`)
2. Add the call to `apps/web/src/lib/api.ts`:

```typescript
export const endpoints = {
  // ...
  milestones: {
    list: (projectId: string) => api.get(`/api/v1/projects/${projectId}/milestones`),
    create: (projectId: string, data: unknown) =>
      api.post(`/api/v1/projects/${projectId}/milestones`, data),
  },
};
```

3. Add query keys:

```typescript
// queryKeys.ts
milestones: {
  list: (projectId: string) => ['milestones', projectId] as const,
},
```

4. Use in a component with `useQuery` or `useMutation`:

```tsx
const { data: milestones, isLoading } = useQuery({
  queryKey: queryKeys.milestones.list(projectId),
  queryFn: () => endpoints.milestones.list(projectId).then((r) => r.data.data),
});
```

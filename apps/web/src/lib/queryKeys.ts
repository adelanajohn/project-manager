/**
 * Centralised TanStack Query key factory.
 * Provides structured, type-safe cache keys for every query in the app.
 */

export const queryKeys = {
  // Auth
  auth: {
    me: () => ['auth', 'me'] as const,
    sessions: () => ['auth', 'sessions'] as const,
    apiKeys: () => ['auth', 'api-keys'] as const,
  },

  // Orgs
  orgs: {
    all: () => ['orgs'] as const,
    detail: (orgId: string) => ['orgs', orgId] as const,
    members: (orgId: string, cursor?: string) => ['orgs', orgId, 'members', cursor] as const,
    notifications: (orgId: string, cursor?: string) => ['orgs', orgId, 'notifications', cursor] as const,
    labels: (orgId: string) => ['orgs', orgId, 'labels'] as const,
    dashboard: (orgId: string) => ['orgs', orgId, 'dashboard'] as const,
  },

  // Projects
  projects: {
    list: (orgId: string) => ['projects', orgId] as const,
    detail: (projectId: string) => ['projects', 'detail', projectId] as const,
    board: (projectId: string, filters?: Record<string, string>) => ['projects', projectId, 'board', filters] as const,
    backlog: (projectId: string) => ['projects', projectId, 'backlog'] as const,
    analytics: (projectId: string) => ['projects', projectId, 'analytics'] as const,
    roadmap: (projectId: string) => ['projects', projectId, 'roadmap'] as const,
    statuses: (projectId: string) => ['projects', projectId, 'statuses'] as const,
    labels: (projectId: string) => ['projects', projectId, 'labels'] as const,
  },

  // Issues
  issues: {
    list: (projectId: string, filters?: Record<string, unknown>) => ['issues', projectId, filters] as const,
    detail: (issueId: string) => ['issues', 'detail', issueId] as const,
    comments: (issueId: string) => ['issues', issueId, 'comments'] as const,
    timeLogs: (issueId: string) => ['issues', issueId, 'time-logs'] as const,
  },

  // Sprints
  sprints: {
    list: (projectId: string) => ['sprints', projectId] as const,
    detail: (sprintId: string) => ['sprints', 'detail', sprintId] as const,
    burndown: (sprintId: string) => ['sprints', sprintId, 'burndown'] as const,
  },

  // Epics
  epics: {
    list: (projectId: string) => ['epics', projectId] as const,
  },

  // Milestones
  milestones: {
    list: (projectId: string) => ['milestones', projectId] as const,
  },

  // Docs
  docs: {
    tree: (projectId: string) => ['docs', projectId] as const,
    detail: (docId: string) => ['docs', 'detail', docId] as const,
  },

  // Search
  search: (query: string, type?: string, projectId?: string) =>
    ['search', query, type, projectId] as const,

  // Admin
  admin: {
    orgs: (cursor?: string) => ['admin', 'orgs', cursor] as const,
    users: (cursor?: string, q?: string) => ['admin', 'users', cursor, q] as const,
    auditLogs: (filters?: Record<string, string>) => ['admin', 'audit-logs', filters] as const,
    metrics: () => ['admin', 'metrics'] as const,
  },
} as const;

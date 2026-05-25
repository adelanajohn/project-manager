export type PlatformRole = 'platform_admin' | 'platform_support';

export type TenantRole =
  | 'tenant_admin'
  | 'tenant_manager'
  | 'tenant_member'
  | 'tenant_viewer'
  | 'tenant_guest';

export type ProjectRole = 'project_lead' | 'project_viewer';

export type OrgPlan = 'free' | 'pro' | 'enterprise';

export type ProjectType = 'scrum' | 'kanban';

export type ProjectStatus = 'active' | 'archived';

export type IssueType = 'epic' | 'story' | 'task' | 'bug' | 'subtask';

export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export type SprintStatus = 'planned' | 'active' | 'completed';

export type StatusCategory = 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused';

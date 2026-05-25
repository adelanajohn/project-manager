import type { TenantRole, PlatformRole, ProjectRole } from './types/enums';

// All possible actions in the system
export type Action =
  | 'view:all_tenants'
  | 'delete:tenant'
  | 'suspend:tenant'
  | 'manage:billing'
  | 'manage:org_members'
  | 'create:project'
  | 'archive:project'
  | 'manage:sprints'
  | 'create:issue'
  | 'edit:own_issue'
  | 'edit:any_issue'
  | 'delete:own_issue'
  | 'delete:any_issue'
  | 'comment:issue'
  | 'view:issue'
  | 'view:analytics'
  | 'view:audit_logs'
  | 'manage:project_settings'
  | 'manage:automations'
  | 'manage:feature_flags'
  | 'impersonate:user'
  | 'view:admin_panel';

export interface UserContext {
  platformRole?: PlatformRole | null;
  tenantRole?: TenantRole | null;
  projectRole?: ProjectRole | null;
  isGuestProjectMember?: boolean;
}

const PLATFORM_ADMIN_ACTIONS: Set<Action> = new Set([
  'view:all_tenants',
  'delete:tenant',
  'suspend:tenant',
  'manage:billing',
  'manage:org_members',
  'create:project',
  'archive:project',
  'manage:sprints',
  'create:issue',
  'edit:own_issue',
  'edit:any_issue',
  'delete:own_issue',
  'delete:any_issue',
  'comment:issue',
  'view:issue',
  'view:analytics',
  'view:audit_logs',
  'manage:project_settings',
  'manage:automations',
  'manage:feature_flags',
  'impersonate:user',
  'view:admin_panel',
]);

const PLATFORM_SUPPORT_ACTIONS: Set<Action> = new Set([
  'view:all_tenants',
  'view:issue',
  'view:analytics',
  'view:audit_logs',
  'view:admin_panel',
]);

const TENANT_ROLE_PERMISSIONS: Record<TenantRole, Set<Action>> = {
  tenant_admin: new Set([
    'manage:billing',
    'manage:org_members',
    'create:project',
    'archive:project',
    'manage:sprints',
    'create:issue',
    'edit:own_issue',
    'edit:any_issue',
    'delete:own_issue',
    'delete:any_issue',
    'comment:issue',
    'view:issue',
    'view:analytics',
    'view:audit_logs',
    'manage:project_settings',
    'manage:automations',
  ]),
  tenant_manager: new Set([
    'create:project',
    'archive:project',
    'manage:sprints',
    'create:issue',
    'edit:own_issue',
    'edit:any_issue',
    'delete:own_issue',
    'delete:any_issue',
    'comment:issue',
    'view:issue',
    'view:analytics',
    'manage:project_settings',
    'manage:automations',
  ]),
  tenant_member: new Set([
    'create:issue',
    'edit:own_issue',
    'delete:own_issue',
    'comment:issue',
    'view:issue',
    'view:analytics',
  ]),
  tenant_viewer: new Set(['view:issue', 'view:analytics']),
  tenant_guest: new Set(['create:issue', 'edit:own_issue', 'comment:issue', 'view:issue']),
};

const PROJECT_ROLE_ADDITIONS: Record<ProjectRole, Set<Action>> = {
  project_lead: new Set(['manage:sprints', 'manage:project_settings']),
  project_viewer: new Set<Action>(),
};

/**
 * Check if a user can perform an action.
 * Platform admins bypass all tenant-level checks.
 */
export function can(user: UserContext, action: Action): boolean {
  // Platform admin has all permissions
  if (user.platformRole === 'platform_admin') {
    return PLATFORM_ADMIN_ACTIONS.has(action);
  }

  // Platform support has read-only admin access
  if (user.platformRole === 'platform_support') {
    return PLATFORM_SUPPORT_ACTIONS.has(action);
  }

  const tenantRole = user.tenantRole;
  if (!tenantRole) return false;

  const tenantPermissions = TENANT_ROLE_PERMISSIONS[tenantRole];
  if (tenantPermissions.has(action)) return true;

  // Check project-level role additions
  if (user.projectRole) {
    const projectAdditions = PROJECT_ROLE_ADDITIONS[user.projectRole];
    if (projectAdditions.has(action)) return true;
  }

  return false;
}

/**
 * Require a specific action — throws if not permitted.
 */
export function require(user: UserContext, action: Action): void {
  if (!can(user, action)) {
    throw new PermissionError(`Action '${action}' is not permitted for this user`);
  }
}

export class PermissionError extends Error {
  readonly code = 'FORBIDDEN';
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

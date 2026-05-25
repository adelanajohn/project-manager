# RBAC — Roles & Permissions

## Platform-Level Roles

These roles apply across all tenants and are stored in `users.platform_role`.

| Role | Description |
|------|-------------|
| `platform_admin` | Full superadmin. View/edit/delete any tenant, impersonate users, system metrics. |
| `platform_support` | Read-only across all tenants for support purposes. Can view audit logs. |

Platform role users access `/admin/*` routes.

## Tenant-Level Roles

Scoped per organization, stored in `org_members.role`.

| Role | Description |
|------|-------------|
| `tenant_admin` | Full control within their org: members, billing, settings, delete org. |
| `tenant_manager` | Create/archive projects, manage sprints, all analytics. No billing. |
| `tenant_member` | Default role. Create/edit own issues, comment on accessible projects. |
| `tenant_viewer` | Read-only. Cannot create or edit anything. |
| `tenant_guest` | External collaborator. Access limited to explicitly invited projects only. |

## Project-Level Role Overrides

Stored in `project_members.role`. Upgrades a member's permissions within one project.

| Role | Additional Permissions |
|------|----------------------|
| `project_lead` | Manage sprints, manage project settings (within that project only) |
| `project_viewer` | Reduces member to read-only within the project |

## Permission Matrix

| Action | platform_admin | tenant_admin | tenant_manager | tenant_member | tenant_viewer | tenant_guest |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|
| View all tenants | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete tenant | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Suspend tenant | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage org billing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage org members | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Archive projects | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage sprints | ✅ | ✅ | ✅ | project_lead | ❌ | ❌ |
| Create issues | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (own project) |
| Edit own issues | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Edit any issue | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete own issues | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Delete any issue | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Comment | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| View issues | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (own project) |
| View analytics | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View audit logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage project settings | ✅ | ✅ | ✅ | project_lead | ❌ | ❌ |
| Manage automations | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View admin panel | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Implementation

**Server-side** (`packages/shared/permissions.ts`):
```ts
import { can } from '@pm/shared';

// In a service method:
const userCtx = { tenantRole: ctx.role, platformRole: ctx.platformRole };
if (!can(userCtx, 'manage:sprints')) {
  throw new PermissionError('Insufficient permissions');
}
```

**Client-side** — UI gating only (never the sole enforcement):
```ts
// Hide a button if user lacks permission
const { user } = useAuthStore();
const canCreate = user?.role !== 'tenant_viewer' && user?.role !== 'tenant_guest';
```

UI gating is supplementary. All enforcement happens server-side.

## Token Payload

The JWT access token carries the minimum context needed for permission checks:
```json
{
  "sub": "user-uuid",
  "orgId": "org-uuid",
  "role": "tenant_member",
  "platformRole": null,
  "sessionId": "session-uuid"
}
```

`orgId` comes from the JWT only — it is never accepted from request params or body. This prevents IDOR attacks where an attacker supplies a different org ID.

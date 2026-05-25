import { describe, it, expect } from 'vitest';
import { can } from './permissions';
import type { UserContext } from './permissions';

describe('can() — permission utility', () => {
  describe('platform_admin', () => {
    const admin: UserContext = { platformRole: 'platform_admin' };

    it('has all platform actions', () => {
      expect(can(admin, 'view:all_tenants')).toBe(true);
      expect(can(admin, 'delete:tenant')).toBe(true);
      expect(can(admin, 'suspend:tenant')).toBe(true);
      expect(can(admin, 'impersonate:user')).toBe(true);
      expect(can(admin, 'view:admin_panel')).toBe(true);
    });

    it('can perform all standard issue actions', () => {
      expect(can(admin, 'create:issue')).toBe(true);
      expect(can(admin, 'edit:any_issue')).toBe(true);
      expect(can(admin, 'delete:any_issue')).toBe(true);
    });
  });

  describe('platform_support', () => {
    const support: UserContext = { platformRole: 'platform_support' };

    it('can view tenants and audit logs', () => {
      expect(can(support, 'view:all_tenants')).toBe(true);
      expect(can(support, 'view:audit_logs')).toBe(true);
      expect(can(support, 'view:admin_panel')).toBe(true);
    });

    it('cannot modify anything', () => {
      expect(can(support, 'delete:tenant')).toBe(false);
      expect(can(support, 'manage:billing')).toBe(false);
      expect(can(support, 'create:issue')).toBe(false);
    });
  });

  describe('tenant_admin', () => {
    const admin: UserContext = { tenantRole: 'tenant_admin' };

    it('can manage org and billing', () => {
      expect(can(admin, 'manage:billing')).toBe(true);
      expect(can(admin, 'manage:org_members')).toBe(true);
    });

    it('can do all issue actions', () => {
      expect(can(admin, 'create:issue')).toBe(true);
      expect(can(admin, 'edit:any_issue')).toBe(true);
      expect(can(admin, 'delete:any_issue')).toBe(true);
    });

    it('can view audit logs', () => {
      expect(can(admin, 'view:audit_logs')).toBe(true);
    });

    it('cannot access platform admin actions', () => {
      expect(can(admin, 'view:all_tenants')).toBe(false);
      expect(can(admin, 'delete:tenant')).toBe(false);
      expect(can(admin, 'impersonate:user')).toBe(false);
    });
  });

  describe('tenant_manager', () => {
    const manager: UserContext = { tenantRole: 'tenant_manager' };

    it('can manage projects and sprints', () => {
      expect(can(manager, 'create:project')).toBe(true);
      expect(can(manager, 'archive:project')).toBe(true);
      expect(can(manager, 'manage:sprints')).toBe(true);
    });

    it('cannot manage billing or members', () => {
      expect(can(manager, 'manage:billing')).toBe(false);
      expect(can(manager, 'manage:org_members')).toBe(false);
    });

    it('cannot view audit logs', () => {
      expect(can(manager, 'view:audit_logs')).toBe(false);
    });
  });

  describe('tenant_member', () => {
    const member: UserContext = { tenantRole: 'tenant_member' };

    it('can create issues and comment', () => {
      expect(can(member, 'create:issue')).toBe(true);
      expect(can(member, 'comment:issue')).toBe(true);
      expect(can(member, 'view:issue')).toBe(true);
    });

    it('can only edit own issues', () => {
      expect(can(member, 'edit:own_issue')).toBe(true);
      expect(can(member, 'edit:any_issue')).toBe(false);
    });

    it('cannot manage projects or sprints', () => {
      expect(can(member, 'create:project')).toBe(false);
      expect(can(member, 'manage:sprints')).toBe(false);
    });
  });

  describe('tenant_member with project_lead override', () => {
    const lead: UserContext = { tenantRole: 'tenant_member', projectRole: 'project_lead' };

    it('can manage sprints at project level', () => {
      expect(can(lead, 'manage:sprints')).toBe(true);
      expect(can(lead, 'manage:project_settings')).toBe(true);
    });

    it('still cannot manage org members', () => {
      expect(can(lead, 'manage:org_members')).toBe(false);
    });
  });

  describe('tenant_viewer', () => {
    const viewer: UserContext = { tenantRole: 'tenant_viewer' };

    it('can view issues', () => {
      expect(can(viewer, 'view:issue')).toBe(true);
      expect(can(viewer, 'view:analytics')).toBe(true);
    });

    it('cannot create, edit, or comment', () => {
      expect(can(viewer, 'create:issue')).toBe(false);
      expect(can(viewer, 'edit:own_issue')).toBe(false);
      expect(can(viewer, 'comment:issue')).toBe(false);
    });
  });

  describe('tenant_guest', () => {
    const guest: UserContext = { tenantRole: 'tenant_guest' };

    it('can create issues and comment in their project', () => {
      expect(can(guest, 'create:issue')).toBe(true);
      expect(can(guest, 'comment:issue')).toBe(true);
    });

    it('cannot edit any issue or view analytics', () => {
      expect(can(guest, 'edit:any_issue')).toBe(false);
      expect(can(guest, 'view:analytics')).toBe(false);
    });

    it('cannot manage org or projects', () => {
      expect(can(guest, 'manage:org_members')).toBe(false);
      expect(can(guest, 'create:project')).toBe(false);
    });
  });

  describe('unauthenticated', () => {
    const anon: UserContext = {};

    it('has no permissions', () => {
      expect(can(anon, 'view:issue')).toBe(false);
      expect(can(anon, 'create:issue')).toBe(false);
      expect(can(anon, 'view:all_tenants')).toBe(false);
    });
  });
});

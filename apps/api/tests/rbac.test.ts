import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  getApp, closeApp,
  createTestUser, createTestOrg,
  loginAs, authRequest,
  cleanupOrg,
} from './helpers';
import { prisma } from '@pm/db';

describe('RBAC — tenant isolation and role enforcement', () => {
  let app: FastifyInstance;
  let orgA: { id: string; slug: string };
  let orgB: { id: string; slug: string };
  let adminToken: string;
  let memberToken: string;
  let viewerToken: string;
  let orgBAdminToken: string;

  beforeAll(async () => {
    app = await getApp();

    // Org A: admin + member + viewer
    orgA = await createTestOrg('A') as any;
    const { user: adminUser, email: adminEmail } = await createTestUser({ orgId: orgA.id, role: 'tenant_admin' });
    const { user: memberUser, email: memberEmail } = await createTestUser({ orgId: orgA.id, role: 'tenant_member' });
    const { email: viewerEmail } = await createTestUser({ orgId: orgA.id, role: 'tenant_viewer' });

    adminToken = await loginAs(app, adminEmail, 'Password123!');
    memberToken = await loginAs(app, memberEmail, 'Password123!');
    viewerToken = await loginAs(app, viewerEmail, 'Password123!');

    // Org B: completely separate tenant
    orgB = await createTestOrg('B') as any;
    const { email: orgBEmail } = await createTestUser({ orgId: orgB.id, role: 'tenant_admin' });
    orgBAdminToken = await loginAs(app, orgBEmail, 'Password123!');
  });

  afterAll(async () => {
    await cleanupOrg(orgA.id);
    await cleanupOrg(orgB.id);
    await closeApp();
  });

  describe('Organization access', () => {
    it('admin can get their own org', async () => {
      const res = await authRequest(app, adminToken).get(`/api/v1/orgs/${orgA.id}`);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.id).toBe(orgA.id);
    });

    it('org B admin cannot read org A data', async () => {
      const res = await authRequest(app, orgBAdminToken).get(`/api/v1/orgs/${orgA.id}`);
      // Should return 404 or 403 — never 200 with real data
      expect([403, 404]).toContain(res.statusCode);
    });
  });

  describe('Project creation — role gating', () => {
    it('tenant_admin can create a project', async () => {
      const res = await authRequest(app, adminToken).post(`/api/v1/orgs/${orgA.id}/projects`, {
        name: 'Admin Project',
        identifier: 'ADM',
        type: 'scrum',
        color: '#6366F1',
      });
      expect(res.statusCode).toBe(201);

      // Cleanup
      const projectId = JSON.parse(res.body).data.id;
      await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
    });

    it('tenant_member cannot create a project', async () => {
      const res = await authRequest(app, memberToken).post(`/api/v1/orgs/${orgA.id}/projects`, {
        name: 'Member Project',
        identifier: 'MBR',
        type: 'scrum',
        color: '#6366F1',
      });
      expect(res.statusCode).toBe(403);
    });

    it('tenant_viewer cannot create a project', async () => {
      const res = await authRequest(app, viewerToken).post(`/api/v1/orgs/${orgA.id}/projects`, {
        name: 'Viewer Project',
        identifier: 'VWR',
        type: 'scrum',
        color: '#6366F1',
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Issue CRUD — role gating', () => {
    let projectId: string;
    let issueId: string;

    beforeAll(async () => {
      // Admin creates a project
      const projRes = await authRequest(app, adminToken).post(`/api/v1/orgs/${orgA.id}/projects`, {
        name: 'RBAC Test Project',
        identifier: 'RBT',
        type: 'scrum',
        color: '#6366F1',
      });
      projectId = JSON.parse(projRes.body).data.id;
    });

    afterAll(async () => {
      await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
    });

    it('tenant_member can create an issue', async () => {
      const res = await authRequest(app, memberToken).post(`/api/v1/projects/${projectId}/issues`, {
        title: 'Member issue',
        type: 'task',
        priority: 'medium',
      });
      expect(res.statusCode).toBe(201);
      issueId = JSON.parse(res.body).data.id;
    });

    it('tenant_viewer cannot create an issue', async () => {
      const res = await authRequest(app, viewerToken).post(`/api/v1/projects/${projectId}/issues`, {
        title: 'Viewer issue attempt',
        type: 'task',
      });
      expect(res.statusCode).toBe(403);
    });

    it('tenant_viewer can read issues', async () => {
      const res = await authRequest(app, viewerToken).get(`/api/v1/projects/${projectId}/issues`);
      expect(res.statusCode).toBe(200);
    });

    it('tenant_member can edit their own issue', async () => {
      const res = await authRequest(app, memberToken).patch(`/api/v1/issues/${issueId}`, {
        title: 'Updated by member',
      });
      expect(res.statusCode).toBe(200);
    });

    it('org B admin cannot read org A issues', async () => {
      const res = await authRequest(app, orgBAdminToken).get(`/api/v1/projects/${projectId}/issues`);
      // RLS or 404 — must not return 200
      expect([403, 404]).toContain(res.statusCode);
    });
  });

  describe('Member management — role gating', () => {
    it('tenant_admin can list members', async () => {
      const res = await authRequest(app, adminToken).get(`/api/v1/orgs/${orgA.id}/members`);
      expect(res.statusCode).toBe(200);
    });

    it('tenant_member cannot invite members', async () => {
      const res = await authRequest(app, memberToken).post(`/api/v1/orgs/${orgA.id}/invites`, {
        email: 'new@example.com',
        role: 'tenant_member',
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Unauthenticated requests', () => {
    it('returns 401 on protected endpoints without token', async () => {
      const res = await app.inject({ method: 'GET', url: `/api/v1/orgs/${orgA.id}` });
      expect(res.statusCode).toBe(401);
    });
  });
});

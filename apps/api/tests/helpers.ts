import { buildApp } from '../src/app';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

let _app: FastifyInstance | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!_app) {
    _app = await buildApp();
    await _app.ready();
  }
  return _app;
}

export async function closeApp() {
  if (_app) {
    await _app.close();
    _app = null;
  }
}

/** Create a test user + org + membership, return the user record */
export async function createTestUser(overrides: {
  email?: string;
  role?: 'tenant_admin' | 'tenant_manager' | 'tenant_member' | 'tenant_viewer' | 'tenant_guest';
  platformRole?: 'platform_admin' | 'platform_support' | null;
  orgId?: string;
} = {}) {
  const email = overrides.email ?? `test-${randomUUID()}@example.com`;
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 4); // low cost for speed

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: 'Test User',
      platformRole: overrides.platformRole ?? null,
      emailVerifiedAt: new Date(),
    },
  });

  let org = null;
  if (overrides.orgId) {
    org = await prisma.organization.findUniqueOrThrow({ where: { id: overrides.orgId } });
    await prisma.orgMember.create({
      data: { orgId: overrides.orgId, userId: user.id, role: overrides.role ?? 'tenant_member' },
    });
  }

  return { user, org, email, password };
}

/** Create a test org */
export async function createTestOrg(nameSuffix?: string) {
  const slug = `test-org-${randomUUID().slice(0, 8)}`;
  return prisma.organization.create({
    data: { name: `Test Org ${nameSuffix ?? ''}`.trim(), slug },
  });
}

/** Login and return the access token */
export async function loginAs(app: FastifyInstance, email: string, password: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });

  if (res.statusCode !== 200) {
    throw new Error(`Login failed for ${email}: ${res.body}`);
  }

  return JSON.parse(res.body).data.accessToken;
}

/** Make an authenticated request */
export function authRequest(app: FastifyInstance, token: string) {
  return {
    get: (url: string) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } }),
    post: (url: string, payload?: unknown) => app.inject({ method: 'POST', url, payload, headers: { authorization: `Bearer ${token}` } }),
    patch: (url: string, payload?: unknown) => app.inject({ method: 'PATCH', url, payload, headers: { authorization: `Bearer ${token}` } }),
    delete: (url: string) => app.inject({ method: 'DELETE', url, headers: { authorization: `Bearer ${token}` } }),
  };
}

/** Clean up test data by org ID */
export async function cleanupOrg(orgId: string) {
  await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
}

/** Clean up test user */
export async function cleanupUser(userId: string) {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

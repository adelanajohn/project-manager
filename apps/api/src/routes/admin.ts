import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import { allQueues } from '../queues/index.js';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { FastifyAdapter } from '@bull-board/fastify';

export default async function adminRoutes(app: FastifyInstance) {
  // All admin routes require platform admin
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.requirePlatformAdmin);

  // ── Bull Board queue monitor ────────────────────────────────────────────
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/api/v1/admin/queues');

  createBullBoard({
    queues: allQueues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  await app.register(serverAdapter.registerPlugin(), { prefix: '/queues', basePath: '/api/v1/admin/queues' });

  // GET /admin/orgs
  app.get('/orgs', {
    schema: { tags: ['Admin'], summary: 'List all organizations', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const take = limit ? parseInt(limit) : 25;

    const orgs = await prisma.organization.findMany({
      include: {
        _count: { select: { members: true, projects: true } },
        subscription: { select: { plan: true, status: true } },
      },
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = orgs.length > take;
    if (hasMore) orgs.pop();

    reply.send({
      data: orgs,
      meta: {
        requestId: request.correlationId,
        timestamp: new Date().toISOString(),
        nextCursor: hasMore ? orgs[orgs.length - 1]?.id ?? null : null,
        hasMore,
      },
      error: null,
    });
  });

  // GET /admin/orgs/:orgId
  app.get('/orgs/:orgId', {
    schema: { tags: ['Admin'], summary: 'Get organization details', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: { include: { user: { select: { id: true, email: true, fullName: true } } } },
        projects: { select: { id: true, name: true, identifier: true, status: true } },
        subscription: true,
        _count: { select: { issues: true } },
      },
    });
    if (!org) {
      reply.status(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'Organization not found' } });
      return;
    }
    reply.send({ data: org, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /admin/orgs/:orgId/suspend
  app.post('/orgs/:orgId/suspend', {
    schema: { tags: ['Admin'], summary: 'Suspend organization', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    await prisma.organization.update({ where: { id: orgId }, data: { suspendedAt: new Date() } });
    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /admin/orgs/:orgId
  app.delete('/orgs/:orgId', {
    schema: { tags: ['Admin'], summary: 'Delete organization', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    await prisma.organization.delete({ where: { id: orgId } });
    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /admin/users
  app.get('/users', {
    schema: { tags: ['Admin'], summary: 'List all users', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { cursor, limit, q } = request.query as { cursor?: string; limit?: string; q?: string };
    const take = limit ? parseInt(limit) : 25;

    const users = await prisma.user.findMany({
      where: q ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
        ],
      } : undefined,
      select: {
        id: true, email: true, fullName: true, avatarUrl: true,
        platformRole: true, emailVerifiedAt: true, lastLoginAt: true, createdAt: true,
        _count: { select: { orgMemberships: true } },
      },
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = users.length > take;
    if (hasMore) users.pop();

    reply.send({
      data: users,
      meta: {
        requestId: request.correlationId,
        timestamp: new Date().toISOString(),
        nextCursor: hasMore ? users[users.length - 1]?.id ?? null : null,
        hasMore,
      },
      error: null,
    });
  });

  // GET /admin/audit-logs
  app.get('/audit-logs', {
    schema: { tags: ['Admin'], summary: 'View audit logs', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { cursor, limit, orgId, actorId, action, from, to } = request.query as Record<string, string>;
    const take = limit ? parseInt(limit) : 50;

    const where: Record<string, unknown> = {};
    if (orgId) where.orgId = orgId;
    if (actorId) where.actorId = actorId;
    if (action) where.action = { contains: action };
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as any).gte = new Date(from);
      if (to) (where.createdAt as any).lte = new Date(to);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, email: true, fullName: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = logs.length > take;
    if (hasMore) logs.pop();

    reply.send({
      data: logs,
      meta: {
        requestId: request.correlationId,
        timestamp: new Date().toISOString(),
        nextCursor: hasMore ? logs[logs.length - 1]?.id ?? null : null,
        hasMore,
      },
      error: null,
    });
  });

  // GET /admin/metrics
  app.get('/metrics', {
    schema: { tags: ['Admin'], summary: 'Platform metrics', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const [totalOrgs, totalUsers, totalIssues, activeOrgs] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.issue.count({ where: { deletedAt: null } }),
      prisma.organization.count({ where: { suspendedAt: null } }),
    ]);

    // Queue depths
    const queueStats: Record<string, unknown> = {};
    for (const queue of allQueues) {
      const counts = await queue.getJobCounts();
      queueStats[queue.name] = counts;
    }

    reply.send({
      data: { totalOrgs, totalUsers, totalIssues, activeOrgs, queues: queueStats },
      meta: { requestId: request.correlationId, timestamp: new Date().toISOString() },
      error: null,
    });
  });
}

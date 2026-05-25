import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';

export default async function notificationRoutes(app: FastifyInstance) {
  // GET /orgs/:orgId/notifications
  app.get('/orgs/:orgId/notifications', {
    preHandler: [app.authenticate],
    schema: { tags: ['Notifications'], summary: 'List notifications', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const userId = request.jwtPayload!.sub;
    const { orgId } = request.params as { orgId: string };
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const take = limit ? parseInt(limit) : 25;

    const notifications = await prisma.notification.findMany({
      where: { userId, orgId },
      take: take + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = notifications.length > take;
    if (hasMore) notifications.pop();

    const unreadCount = await prisma.notification.count({ where: { userId, orgId, readAt: null } });

    reply.send({
      data: { notifications, unreadCount },
      meta: {
        requestId: request.correlationId,
        timestamp: new Date().toISOString(),
        nextCursor: hasMore ? notifications[notifications.length - 1]?.id ?? null : null,
        hasMore,
      },
      error: null,
    });
  });

  // PATCH /notifications/:id/read
  app.patch('/notifications/:id/read', {
    preHandler: [app.authenticate],
    schema: { tags: ['Notifications'], summary: 'Mark notification as read', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.jwtPayload!.sub;

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });

    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // PATCH /notifications/read-all
  app.patch('/notifications/read-all', {
    preHandler: [app.authenticate],
    schema: { tags: ['Notifications'], summary: 'Mark all notifications as read', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const userId = request.jwtPayload!.sub;
    const orgId = request.jwtPayload!.orgId;

    await prisma.notification.updateMany({
      where: { userId, orgId, readAt: null },
      data: { readAt: new Date() },
    });

    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

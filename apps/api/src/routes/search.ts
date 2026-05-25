import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';

export default async function searchRoutes(app: FastifyInstance) {
  // GET /search?q=&orgId=&type=&projectId=
  app.get('/search', {
    preHandler: [app.authenticate],
    schema: { tags: ['Search'], summary: 'Global search', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { q, type, projectId } = request.query as {
      q?: string;
      type?: 'issue' | 'doc' | 'member';
      projectId?: string;
    };

    const orgId = request.jwtPayload!.orgId;

    if (!q || q.trim().length < 1) {
      reply.send({ data: { issues: [], docs: [], members: [] }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
      return;
    }

    const term = q.trim();
    const results: Record<string, unknown[]> = { issues: [], docs: [], members: [] };

    if (!type || type === 'issue') {
      results.issues = await prisma.issue.findMany({
        where: {
          orgId,
          deletedAt: null,
          ...(projectId ? { projectId } : {}),
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { issueKey: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, issueKey: true, title: true, priority: true, type: true,
          status: true,
          project: { select: { id: true, name: true, identifier: true, color: true } },
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (!type || type === 'doc') {
      results.docs = await prisma.doc.findMany({
        where: {
          orgId,
          deletedAt: null,
          ...(projectId ? { projectId } : {}),
          title: { contains: term, mode: 'insensitive' },
        },
        select: {
          id: true, title: true,
          project: { select: { id: true, name: true } },
        },
        take: 5,
      });
    }

    if (!type || type === 'member') {
      results.members = await prisma.orgMember.findMany({
        where: {
          orgId,
          user: {
            OR: [
              { fullName: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
        include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
        take: 5,
      });
    }

    reply.send({
      data: results,
      meta: { requestId: request.correlationId, timestamp: new Date().toISOString() },
      error: null,
    });
  });
}

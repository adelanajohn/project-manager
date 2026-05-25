import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CreateTimeLogSchema = z.object({
  durationMin: z.number().int().positive(),
  description: z.string().optional().nullable(),
  loggedAt: z.string().datetime().optional(),
});

export default async function timeLogRoutes(app: FastifyInstance) {
  // GET /issues/:issueId/time-logs
  app.get('/issues/:issueId/time-logs', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'List time logs for an issue', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const logs = await prisma.timeLog.findMany({
      where: { issueId },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
      orderBy: { loggedAt: 'desc' },
    });

    const totalMinutes = logs.reduce((s, l) => s + l.durationMin, 0);
    reply.send({ data: { logs, totalMinutes }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /issues/:issueId/time-logs
  app.post('/issues/:issueId/time-logs', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Log time on an issue', body: zodToJsonSchema(CreateTimeLogSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const orgId = request.jwtPayload!.orgId;
    const userId = request.jwtPayload!.sub;
    const input = CreateTimeLogSchema.parse(request.body);

    const log = await prisma.timeLog.create({
      data: {
        issueId,
        orgId,
        userId,
        durationMin: input.durationMin,
        description: input.description,
        loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
      },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    });

    reply.status(201).send({ data: log, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /time-logs/:logId
  app.delete('/time-logs/:logId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Delete a time log', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { logId } = request.params as { logId: string };
    const userId = request.jwtPayload!.sub;

    const log = await prisma.timeLog.findUnique({ where: { id: logId } });
    if (!log) {
      reply.status(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'Time log not found' } });
      return;
    }
    if (log.userId !== userId) {
      reply.status(403).send({ data: null, error: { code: 'FORBIDDEN', message: 'Cannot delete another user\'s time log' } });
      return;
    }

    await prisma.timeLog.delete({ where: { id: logId } });
    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

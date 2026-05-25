import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import type { RequestContext } from '@pm/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CreateEpicSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366F1'),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

const UpdateEpicSchema = CreateEpicSchema.partial();

function makeCtx(request: any): RequestContext {
  return {
    correlationId: request.correlationId,
    userId: request.jwtPayload!.sub,
    orgId: request.jwtPayload!.orgId,
    role: request.jwtPayload!.role,
    platformRole: request.jwtPayload!.platformRole,
    sessionId: request.jwtPayload!.sessionId,
  };
}

export default async function epicRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/epics', {
    preHandler: [app.authenticate],
    schema: { tags: ['Epics'], summary: 'List epics', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const epics = await prisma.epic.findMany({
      where: { projectId, orgId },
      include: {
        issues: {
          where: { deletedAt: null },
          select: { id: true, status: true, estimate: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Compute progress
    const epicData = epics.map((epic) => {
      const total = epic.issues.length;
      const done = epic.issues.filter((i) => i.status?.category === 'done').length;
      return { ...epic, progress: total > 0 ? Math.round((done / total) * 100) : 0, totalIssues: total, doneIssues: done };
    });

    reply.send({ data: epicData, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  app.post('/projects/:projectId/epics', {
    preHandler: [app.authenticate],
    schema: { tags: ['Epics'], summary: 'Create epic', body: zodToJsonSchema(CreateEpicSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = CreateEpicSchema.parse(request.body);

    const epic = await prisma.epic.create({
      data: {
        projectId,
        orgId,
        title: input.title,
        description: input.description,
        color: input.color,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    });

    reply.status(201).send({ data: epic, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  app.patch('/epics/:epicId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Epics'], summary: 'Update epic', body: zodToJsonSchema(UpdateEpicSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { epicId } = request.params as { epicId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = UpdateEpicSchema.parse(request.body);

    const epic = await prisma.epic.update({
      where: { id: epicId },
      data: {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
    });

    reply.send({ data: epic, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  app.delete('/epics/:epicId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Epics'], summary: 'Delete epic', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { epicId } = request.params as { epicId: string };
    await prisma.epic.delete({ where: { id: epicId } });
    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /projects/:projectId/roadmap - epics + milestones for Gantt
  app.get('/projects/:projectId/roadmap', {
    preHandler: [app.authenticate],
    schema: { tags: ['Epics'], summary: 'Get roadmap data for Gantt', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;

    const [epics, milestones, sprints] = await Promise.all([
      prisma.epic.findMany({
        where: { projectId, orgId },
        include: {
          issues: {
            where: { deletedAt: null },
            select: { id: true, status: true, estimate: true },
          },
        },
      }),
      prisma.milestone.findMany({ where: { projectId }, orderBy: { dueDate: 'asc' } }),
      prisma.sprint.findMany({
        where: { projectId, orgId, status: { not: 'completed' } },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    reply.send({
      data: { epics, milestones, sprints },
      meta: { requestId: request.correlationId, timestamp: new Date().toISOString() },
      error: null,
    });
  });
}

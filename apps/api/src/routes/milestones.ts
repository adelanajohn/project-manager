import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CreateMilestoneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const UpdateMilestoneSchema = CreateMilestoneSchema.partial().extend({
  status: z.enum(['open', 'closed']).optional(),
});

export default async function milestoneRoutes(app: FastifyInstance) {
  // GET /projects/:projectId/milestones
  app.get('/projects/:projectId/milestones', {
    preHandler: [app.authenticate],
    schema: { tags: ['Milestones'], summary: 'List milestones', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      include: { _count: { select: { issues: true } } },
      orderBy: { dueDate: 'asc' },
    });
    reply.send({ data: milestones, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /projects/:projectId/milestones
  app.post('/projects/:projectId/milestones', {
    preHandler: [app.authenticate],
    schema: { tags: ['Milestones'], summary: 'Create milestone', body: zodToJsonSchema(CreateMilestoneSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const input = CreateMilestoneSchema.parse(request.body);
    const milestone = await prisma.milestone.create({
      data: { projectId, name: input.name, description: input.description, dueDate: input.dueDate ? new Date(input.dueDate) : null },
    });
    reply.status(201).send({ data: milestone, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // PATCH /milestones/:milestoneId
  app.patch('/milestones/:milestoneId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Milestones'], summary: 'Update milestone', body: zodToJsonSchema(UpdateMilestoneSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { milestoneId } = request.params as { milestoneId: string };
    const { dueDate, ...rest } = UpdateMilestoneSchema.parse(request.body);
    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: { ...rest, ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}) },
    });
    reply.send({ data: milestone, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /milestones/:milestoneId
  app.delete('/milestones/:milestoneId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Milestones'], summary: 'Delete milestone', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { milestoneId } = request.params as { milestoneId: string };
    await prisma.milestone.delete({ where: { id: milestoneId } });
    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

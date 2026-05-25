import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CreateLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#64748B'),
  projectId: z.string().uuid().optional().nullable(),
});

export default async function labelRoutes(app: FastifyInstance) {
  // GET /orgs/:orgId/labels
  app.get('/orgs/:orgId/labels', {
    preHandler: [app.authenticate],
    schema: { tags: ['Labels'], summary: 'List org labels', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const { projectId } = request.query as { projectId?: string };

    const labels = await prisma.label.findMany({
      where: {
        orgId,
        ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : {}),
      },
      orderBy: { name: 'asc' },
    });

    reply.send({ data: labels, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /orgs/:orgId/labels
  app.post('/orgs/:orgId/labels', {
    preHandler: [app.authenticate],
    schema: { tags: ['Labels'], summary: 'Create label', body: zodToJsonSchema(CreateLabelSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const input = CreateLabelSchema.parse(request.body);

    const label = await prisma.label.create({
      data: { orgId, ...input },
    });

    reply.status(201).send({ data: label, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // PATCH /labels/:labelId
  app.patch('/labels/:labelId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Labels'], summary: 'Update label', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { labelId } = request.params as { labelId: string };
    const input = CreateLabelSchema.partial().parse(request.body);

    const label = await prisma.label.update({ where: { id: labelId }, data: input });
    reply.send({ data: label, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /labels/:labelId
  app.delete('/labels/:labelId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Labels'], summary: 'Delete label', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { labelId } = request.params as { labelId: string };
    await prisma.label.delete({ where: { id: labelId } });
    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

import type { FastifyInstance } from 'fastify';
import { sprintService } from '../services/sprint.service.js';
import { CreateSprintSchema, UpdateSprintSchema, CompleteSprintSchema } from '@pm/shared';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { RequestContext } from '@pm/shared';

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

export default async function sprintRoutes(app: FastifyInstance) {
  app.get('/projects/:projectId/sprints', {
    preHandler: [app.authenticate],
    schema: { tags: ['Sprints'], summary: 'List sprints', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const data = await sprintService.list(projectId, orgId);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  app.post('/projects/:projectId/sprints', {
    preHandler: [app.authenticate],
    schema: { tags: ['Sprints'], summary: 'Create sprint', body: zodToJsonSchema(CreateSprintSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = CreateSprintSchema.parse(request.body);
    const data = await sprintService.create(projectId, orgId, input, makeCtx(request));
    reply.status(201).send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  app.patch('/sprints/:sprintId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Sprints'], summary: 'Update sprint', body: zodToJsonSchema(UpdateSprintSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = UpdateSprintSchema.parse(request.body);
    const data = await sprintService.update(sprintId, orgId, input, makeCtx(request));
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  app.post('/sprints/:sprintId/start', {
    preHandler: [app.authenticate],
    schema: { tags: ['Sprints'], summary: 'Start sprint', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string };
    const orgId = request.jwtPayload!.orgId;
    const data = await sprintService.start(sprintId, orgId, makeCtx(request));
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  app.post('/sprints/:sprintId/complete', {
    preHandler: [app.authenticate],
    schema: { tags: ['Sprints'], summary: 'Complete sprint', body: zodToJsonSchema(CompleteSprintSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = CompleteSprintSchema.parse(request.body);
    const data = await sprintService.complete(sprintId, orgId, input, makeCtx(request));
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  app.get('/sprints/:sprintId/burndown', {
    preHandler: [app.authenticate],
    schema: { tags: ['Sprints'], summary: 'Get burndown data', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string };
    const orgId = request.jwtPayload!.orgId;
    const data = await sprintService.getBurndown(sprintId, orgId);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

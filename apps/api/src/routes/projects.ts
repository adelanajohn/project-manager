import type { FastifyInstance } from 'fastify';
import { projectService } from '../services/project.service.js';
import { CreateProjectSchema, UpdateProjectSchema, CreateStatusSchema } from '@pm/shared';
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
    ipAddress: request.ip,
  };
}

export default async function projectRoutes(app: FastifyInstance) {
  // GET /orgs/:orgId/projects
  app.get('/orgs/:orgId/projects', {
    preHandler: [app.authenticate],
    schema: { tags: ['Projects'], summary: 'List projects', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const data = await projectService.list(orgId);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /orgs/:orgId/projects
  app.post('/orgs/:orgId/projects', {
    preHandler: [app.authenticate],
    schema: { tags: ['Projects'], summary: 'Create project', body: zodToJsonSchema(CreateProjectSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const input = CreateProjectSchema.parse(request.body);
    const ctx = { ...makeCtx(request), orgId };
    const data = await projectService.create(orgId, input, ctx);
    reply.status(201).send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /projects/:projectId
  app.get('/projects/:projectId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Projects'], summary: 'Get project', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const data = await projectService.getById(projectId, orgId);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // PATCH /projects/:projectId
  app.patch('/projects/:projectId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Projects'], summary: 'Update project', body: zodToJsonSchema(UpdateProjectSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = UpdateProjectSchema.parse(request.body);
    const data = await projectService.update(projectId, orgId, input, makeCtx(request));
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /projects/:projectId
  app.delete('/projects/:projectId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Projects'], summary: 'Delete project', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const data = await projectService.delete(projectId, orgId, makeCtx(request));
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /projects/:projectId/board
  app.get('/projects/:projectId/board', {
    preHandler: [app.authenticate],
    schema: { tags: ['Projects'], summary: 'Get board view', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const filters = request.query as Record<string, string>;
    const data = await projectService.getBoard(projectId, orgId, filters);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /projects/:projectId/backlog
  app.get('/projects/:projectId/backlog', {
    preHandler: [app.authenticate],
    schema: { tags: ['Projects'], summary: 'Get backlog', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const data = await projectService.getBacklog(projectId, orgId);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /projects/:projectId/statuses
  app.post('/projects/:projectId/statuses', {
    preHandler: [app.authenticate],
    schema: { tags: ['Projects'], summary: 'Create status', body: zodToJsonSchema(CreateStatusSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = CreateStatusSchema.parse(request.body);
    const data = await projectService.createStatus(projectId, orgId, input, makeCtx(request));
    reply.status(201).send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /projects/:projectId/analytics
  app.get('/projects/:projectId/analytics', {
    preHandler: [app.authenticate],
    schema: { tags: ['Projects'], summary: 'Get project analytics', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const data = await projectService.getAnalytics(projectId, orgId);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

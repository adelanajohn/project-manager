import type { FastifyInstance } from 'fastify';
import { issueService } from '../services/issue.service.js';
import { CreateIssueSchema, UpdateIssueSchema, UpdateIssueRankSchema, CreateCommentSchema, BulkUpdateIssuesSchema } from '@pm/shared';
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

export default async function issueRoutes(app: FastifyInstance) {
  // GET /projects/:projectId/issues
  app.get('/projects/:projectId/issues', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'List issues', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const query = request.query as Record<string, string>;
    const { cursor, limit, ...filters } = query;
    const result = await issueService.list(projectId, orgId, filters, cursor, limit ? parseInt(limit) : 25);
    reply.send({
      data: result.issues,
      meta: { requestId: request.correlationId, timestamp: new Date().toISOString(), nextCursor: result.nextCursor, hasMore: !!result.nextCursor },
      error: null,
    });
  });

  // POST /projects/:projectId/issues
  app.post('/projects/:projectId/issues', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Create issue', body: zodToJsonSchema(CreateIssueSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = CreateIssueSchema.parse(request.body);
    const data = await issueService.create(projectId, orgId, input, makeCtx(request));
    reply.status(201).send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /projects/:projectId/issues/bulk
  app.post('/projects/:projectId/issues/bulk', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Bulk update issues', body: zodToJsonSchema(BulkUpdateIssuesSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const orgId = request.jwtPayload!.orgId;
    const input = BulkUpdateIssuesSchema.parse(request.body);
    const data = await issueService.bulkUpdate(orgId, input, makeCtx(request));
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /issues/:issueId
  app.get('/issues/:issueId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Get issue', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const orgId = request.jwtPayload!.orgId;
    const data = await issueService.getById(issueId, orgId);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // PATCH /issues/:issueId
  app.patch('/issues/:issueId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Update issue', body: zodToJsonSchema(UpdateIssueSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = UpdateIssueSchema.parse(request.body);
    const data = await issueService.update(issueId, orgId, input, makeCtx(request));
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /issues/:issueId
  app.delete('/issues/:issueId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Delete issue', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const orgId = request.jwtPayload!.orgId;
    const data = await issueService.delete(issueId, orgId, makeCtx(request));
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // PATCH /issues/:issueId/rank
  app.patch('/issues/:issueId/rank', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Reorder issue', body: zodToJsonSchema(UpdateIssueRankSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = UpdateIssueRankSchema.parse(request.body);
    const data = await issueService.updateRank(issueId, orgId, input, makeCtx(request));
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /issues/:issueId/comments
  app.get('/issues/:issueId/comments', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'List comments', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const orgId = request.jwtPayload!.orgId;
    const data = await issueService.listComments(issueId, orgId);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /issues/:issueId/comments
  app.post('/issues/:issueId/comments', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Create comment', body: zodToJsonSchema(CreateCommentSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = CreateCommentSchema.parse(request.body);
    const data = await issueService.createComment(issueId, orgId, input, makeCtx(request));
    reply.status(201).send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

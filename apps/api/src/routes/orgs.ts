import type { FastifyInstance } from 'fastify';
import { orgService } from '../services/org.service.js';
import { CreateOrgSchema, UpdateOrgSchema, InviteMemberSchema, UpdateMemberRoleSchema } from '@pm/shared';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { RequestContext } from '@pm/shared';

export default async function orgRoutes(app: FastifyInstance) {
  // GET /orgs
  app.get('/', {
    preHandler: [app.authenticate],
    schema: { tags: ['Organizations'], summary: 'List orgs for current user', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const data = await orgService.list(request.jwtPayload!.sub, request.jwtPayload!.platformRole);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /orgs
  app.post('/', {
    preHandler: [app.authenticate],
    schema: { tags: ['Organizations'], summary: 'Create organization', body: zodToJsonSchema(CreateOrgSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const input = CreateOrgSchema.parse(request.body);
    const data = await orgService.create(input, request.jwtPayload!.sub);
    reply.status(201).send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /orgs/:orgId
  app.get('/:orgId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Organizations'], summary: 'Get organization', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const data = await orgService.getById(orgId);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // PATCH /orgs/:orgId
  app.patch('/:orgId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Organizations'], summary: 'Update organization', body: zodToJsonSchema(UpdateOrgSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const input = UpdateOrgSchema.parse(request.body);
    const data = await orgService.update(orgId, input, {
      userId: request.jwtPayload!.sub,
      role: request.jwtPayload!.role,
    });
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /orgs/:orgId
  app.delete('/:orgId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Organizations'], summary: 'Delete organization', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const ctx: RequestContext = {
      correlationId: request.correlationId,
      userId: request.jwtPayload!.sub,
      orgId,
      role: request.jwtPayload!.role,
      platformRole: request.jwtPayload!.platformRole,
      sessionId: request.jwtPayload!.sessionId,
      ipAddress: request.ip,
    };
    const data = await orgService.delete(orgId, ctx);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /orgs/:orgId/members
  app.get('/:orgId/members', {
    preHandler: [app.authenticate],
    schema: { tags: ['Organizations'], summary: 'List org members', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await orgService.listMembers(orgId, cursor, limit ? parseInt(limit) : 25);
    reply.send({
      data: result.members,
      meta: { requestId: request.correlationId, timestamp: new Date().toISOString(), nextCursor: result.nextCursor, hasMore: !!result.nextCursor },
      error: null,
    });
  });

  // POST /orgs/:orgId/invites
  app.post('/:orgId/invites', {
    preHandler: [app.authenticate],
    schema: { tags: ['Organizations'], summary: 'Invite member', body: zodToJsonSchema(InviteMemberSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const input = InviteMemberSchema.parse(request.body);
    const ctx: RequestContext = {
      correlationId: request.correlationId,
      userId: request.jwtPayload!.sub,
      orgId,
      role: request.jwtPayload!.role,
      platformRole: request.jwtPayload!.platformRole,
      sessionId: request.jwtPayload!.sessionId,
      ipAddress: request.ip,
    };
    const data = await orgService.inviteMember(orgId, input, ctx);
    reply.status(201).send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // PATCH /orgs/:orgId/members/:userId
  app.patch('/:orgId/members/:userId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Organizations'], summary: 'Update member role', body: zodToJsonSchema(UpdateMemberRoleSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId, userId } = request.params as { orgId: string; userId: string };
    const input = UpdateMemberRoleSchema.parse(request.body);
    const ctx: RequestContext = {
      correlationId: request.correlationId,
      userId: request.jwtPayload!.sub,
      orgId,
      role: request.jwtPayload!.role,
      platformRole: request.jwtPayload!.platformRole,
      sessionId: request.jwtPayload!.sessionId,
    };
    const data = await orgService.updateMemberRole(orgId, userId, input, ctx);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /orgs/:orgId/members/:userId
  app.delete('/:orgId/members/:userId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Organizations'], summary: 'Remove member', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { orgId, userId } = request.params as { orgId: string; userId: string };
    const ctx: RequestContext = {
      correlationId: request.correlationId,
      userId: request.jwtPayload!.sub,
      orgId,
      role: request.jwtPayload!.role,
      platformRole: request.jwtPayload!.platformRole,
      sessionId: request.jwtPayload!.sessionId,
    };
    const data = await orgService.removeMember(orgId, userId, ctx);
    reply.send({ data, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

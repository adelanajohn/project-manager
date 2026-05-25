import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@pm/db';

/**
 * Middleware to resolve org from route param and verify membership.
 * Attaches orgMember to request for use in handlers.
 */
export async function requireOrgMember(request: FastifyRequest, reply: FastifyReply) {
  const { orgId } = request.params as { orgId?: string };
  const userId = request.jwtPayload?.sub;

  if (!orgId || !userId) {
    reply.status(400).send({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Missing orgId' } });
    return;
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    reply.status(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'Organization not found' } });
    return;
  }

  if (org.suspendedAt) {
    reply.status(403).send({ data: null, error: { code: 'FORBIDDEN', message: 'This organization has been suspended' } });
    return;
  }

  // Platform admins bypass membership check
  if (request.jwtPayload?.platformRole === 'platform_admin') return;

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });

  if (!member) {
    reply.status(403).send({ data: null, error: { code: 'FORBIDDEN', message: 'Not a member of this organization' } });
  }
}

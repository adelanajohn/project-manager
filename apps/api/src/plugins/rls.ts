import fp from 'fastify-plugin';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma, withRls } from '@pm/db';

/**
 * After JWT auth, create a request-scoped Prisma client with RLS session
 * variables injected. Available as request.db throughout the request.
 */

declare module 'fastify' {
  interface FastifyRequest {
    /** RLS-scoped Prisma client for this request. Use this instead of bare prisma. */
    db: typeof prisma;
  }
}

export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const payload = request.jwtPayload;
    if (payload?.sub && payload?.orgId) {
      (request as any).db = withRls(prisma, {
        orgId: payload.orgId,
        userId: payload.sub,
        role: payload.role ?? 'tenant_member',
      });
    } else {
      // Unauthenticated requests — plain prisma (public routes only)
      (request as any).db = prisma;
    }
  });
}, { name: 'rls-plugin' });

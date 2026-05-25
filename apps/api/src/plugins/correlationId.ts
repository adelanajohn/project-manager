import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';
import type { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      `req_${randomUUID()}`;

    request.correlationId = correlationId;

    reply.header('x-correlation-id', correlationId);
    reply.header('x-request-id', correlationId);

    request.log = request.log.child({ correlationId });
  });
}, { name: 'correlation-id' });

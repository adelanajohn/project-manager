import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import { redis } from '../redis.js';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Liveness check',
      response: { 200: { type: 'object', properties: { status: { type: 'string' } } } },
    },
  }, async () => ({ status: 'ok' }));

  app.get('/health/ready', {
    schema: { tags: ['Health'], summary: 'Readiness check' },
  }, async (_, reply) => {
    const checks: Record<string, string> = {};
    let healthy = true;

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
      healthy = false;
    }

    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
      healthy = false;
    }

    reply.status(healthy ? 200 : 503).send({ status: healthy ? 'ready' : 'not_ready', checks });
  });
}

import fp from 'fastify-plugin';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../jwt.js';
import type { JwtPayload } from '@pm/shared';
import { redis } from '../redis.js';

declare module 'fastify' {
  interface FastifyRequest {
    jwtPayload?: JwtPayload;
  }
}

export default fp(async (fastify) => {
  // Decorator: verify JWT from Authorization header
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401).send({ data: null, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
      return;
    }

    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);

      // Check blacklist
      const blacklisted = await redis.get(`blacklist:${payload.sessionId}`);
      if (blacklisted) {
        reply.status(401).send({ data: null, error: { code: 'TOKEN_EXPIRED', message: 'Session revoked' } });
        return;
      }

      request.jwtPayload = payload;
    } catch {
      reply.status(401).send({ data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }
  });

  // Decorator: require platform admin
  fastify.decorate('requirePlatformAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.jwtPayload?.platformRole !== 'platform_admin') {
      reply.status(403).send({ data: null, error: { code: 'FORBIDDEN', message: 'Platform admin access required' } });
    }
  });
}, { name: 'auth-plugin' });

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePlatformAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.string().datetime().optional().nullable(),
});

function generateApiKey(): { raw: string; hash: string } {
  const raw = `pmk_${randomBytes(32).toString('hex')}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export default async function apiKeyRoutes(app: FastifyInstance) {
  // GET /auth/api-keys
  app.get('/api-keys', {
    preHandler: [app.authenticate],
    schema: { tags: ['Auth'], summary: 'List API keys', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const userId = request.jwtPayload!.sub;
    const keys = await prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      select: { id: true, name: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    reply.send({ data: keys, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /auth/api-keys
  app.post('/api-keys', {
    preHandler: [app.authenticate],
    schema: { tags: ['Auth'], summary: 'Create API key', body: zodToJsonSchema(CreateApiKeySchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const userId = request.jwtPayload!.sub;
    const input = CreateApiKeySchema.parse(request.body);
    const { raw, hash } = generateApiKey();

    const key = await prisma.apiKey.create({
      data: {
        userId,
        name: input.name,
        keyHash: hash,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      select: { id: true, name: true, expiresAt: true, createdAt: true },
    });

    // Return raw key ONCE — never stored in plain text
    reply.status(201).send({
      data: { ...key, key: raw },
      meta: { requestId: request.correlationId, timestamp: new Date().toISOString() },
      error: null,
    });
  });

  // DELETE /auth/api-keys/:keyId
  app.delete('/api-keys/:keyId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Auth'], summary: 'Revoke API key', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { keyId } = request.params as { keyId: string };
    const userId = request.jwtPayload!.sub;

    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key || key.userId !== userId) {
      reply.status(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'API key not found' } });
      return;
    }

    await prisma.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } });
    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

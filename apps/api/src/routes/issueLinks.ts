import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CreateLinkSchema = z.object({
  blockedId: z.string().uuid(),
  linkType: z.enum(['blocks', 'is_blocked_by', 'duplicates', 'relates_to']).default('blocks'),
});

export default async function issueLinkRoutes(app: FastifyInstance) {
  // POST /issues/:issueId/links
  app.post('/issues/:issueId/links', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Create issue link', body: zodToJsonSchema(CreateLinkSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const input = CreateLinkSchema.parse(request.body);

    // Prevent self-links
    if (issueId === input.blockedId) {
      reply.status(400).send({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Cannot link an issue to itself' } });
      return;
    }

    // Normalise direction for is_blocked_by
    const [blockerId, blockedId] =
      input.linkType === 'is_blocked_by'
        ? [input.blockedId, issueId]
        : [issueId, input.blockedId];

    const link = await prisma.issueLink.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: { linkType: input.linkType },
      create: { blockerId, blockedId, linkType: input.linkType },
    });

    reply.status(201).send({ data: link, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /issues/:issueId/links/:linkId
  app.delete('/issues/:issueId/links/:linkId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Remove issue link', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { linkId } = request.params as { issueId: string; linkId: string };
    await prisma.issueLink.delete({ where: { id: linkId } });
    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

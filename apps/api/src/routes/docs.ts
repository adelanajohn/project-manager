import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CreateDocSchema = z.object({
  title: z.string().min(1).max(200),
  parentId: z.string().uuid().optional().nullable(),
  content: z.any().optional(),
});

const UpdateDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
  parentId: z.string().uuid().optional().nullable(),
});

export default async function docRoutes(app: FastifyInstance) {
  // GET /projects/:projectId/docs — returns page tree
  app.get('/projects/:projectId/docs', {
    preHandler: [app.authenticate],
    schema: { tags: ['Docs'], summary: 'List docs (page tree)', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;

    const docs = await prisma.doc.findMany({
      where: { projectId, orgId, deletedAt: null },
      select: {
        id: true, title: true, parentId: true, version: true,
        author: { select: { id: true, fullName: true, avatarUrl: true } },
        createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build tree
    const tree = buildDocTree(docs, null);
    reply.send({ data: tree, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /projects/:projectId/docs
  app.post('/projects/:projectId/docs', {
    preHandler: [app.authenticate],
    schema: { tags: ['Docs'], summary: 'Create doc', body: zodToJsonSchema(CreateDocSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const orgId = request.jwtPayload!.orgId;
    const userId = request.jwtPayload!.sub;
    const input = CreateDocSchema.parse(request.body);

    const doc = await prisma.doc.create({
      data: {
        projectId,
        orgId,
        title: input.title,
        parentId: input.parentId,
        content: input.content ?? {},
        authorId: userId,
      },
    });

    reply.status(201).send({ data: doc, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /docs/:docId
  app.get('/docs/:docId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Docs'], summary: 'Get doc', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { docId } = request.params as { docId: string };
    const orgId = request.jwtPayload!.orgId;

    const doc = await prisma.doc.findFirst({
      where: { id: docId, orgId, deletedAt: null },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
        children: { where: { deletedAt: null }, select: { id: true, title: true } },
        parent: { select: { id: true, title: true } },
      },
    });

    if (!doc) {
      reply.status(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'Doc not found' } });
      return;
    }

    reply.send({ data: doc, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // PATCH /docs/:docId
  app.patch('/docs/:docId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Docs'], summary: 'Update doc', body: zodToJsonSchema(UpdateDocSchema), security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { docId } = request.params as { docId: string };
    const orgId = request.jwtPayload!.orgId;
    const input = UpdateDocSchema.parse(request.body);

    const doc = await prisma.doc.update({
      where: { id: docId },
      data: {
        ...input,
        version: { increment: 1 },
      },
    });

    reply.send({ data: doc, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /docs/:docId
  app.delete('/docs/:docId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Docs'], summary: 'Delete doc', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { docId } = request.params as { docId: string };
    await prisma.doc.update({ where: { id: docId }, data: { deletedAt: new Date() } });
    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

type DocNode = {
  id: string;
  title: string;
  parentId: string | null;
  children?: DocNode[];
  [key: string]: unknown;
};

function buildDocTree(docs: DocNode[], parentId: string | null): DocNode[] {
  return docs
    .filter((d) => d.parentId === parentId)
    .map((d) => ({ ...d, children: buildDocTree(docs, d.id) }));
}

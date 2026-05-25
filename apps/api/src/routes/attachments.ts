import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from '../env.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'text/plain', 'text/markdown',
  'application/zip', 'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4', 'video/webm',
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

let s3Client: S3Client | null = null;

function getS3Client() {
  if (!s3Client && env.S3_BUCKET) {
    s3Client = new S3Client({
      region: env.S3_REGION,
      credentials: env.S3_ACCESS_KEY_ID
        ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY! }
        : undefined,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: !!env.S3_ENDPOINT,
    });
  }
  return s3Client;
}

export default async function attachmentRoutes(app: FastifyInstance) {
  // POST /issues/:issueId/attachments/presign — get presigned upload URL
  app.post('/issues/:issueId/attachments/presign', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Get presigned upload URL', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const orgId = request.jwtPayload!.sub;
    const { filename, mimeType, sizeBytes } = request.body as { filename: string; mimeType: string; sizeBytes: number };

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      reply.status(400).send({ data: null, error: { code: 'VALIDATION_ERROR', message: 'File type not allowed' } });
      return;
    }

    if (sizeBytes > MAX_SIZE_BYTES) {
      reply.status(400).send({ data: null, error: { code: 'VALIDATION_ERROR', message: 'File exceeds 10MB limit' } });
      return;
    }

    const s3 = getS3Client();
    if (!s3 || !env.S3_BUCKET) {
      reply.status(503).send({ data: null, error: { code: 'INTERNAL_ERROR', message: 'File storage not configured' } });
      return;
    }

    // Sanitize filename against path traversal
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `attachments/${orgId}/${issueId}/${randomUUID()}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3Key,
      ContentType: mimeType,
      ContentLength: sizeBytes,
      Metadata: { issueId, orgId, uploadedBy: request.jwtPayload!.sub },
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    reply.send({
      data: { uploadUrl, s3Key },
      meta: { requestId: request.correlationId, timestamp: new Date().toISOString() },
      error: null,
    });
  });

  // POST /issues/:issueId/attachments — confirm upload and record
  app.post('/issues/:issueId/attachments', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Confirm attachment upload', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { issueId } = request.params as { issueId: string };
    const orgId = request.jwtPayload!.orgId;
    const userId = request.jwtPayload!.sub;
    const { s3Key, filename, mimeType, sizeBytes } = request.body as {
      s3Key: string; filename: string; mimeType: string; sizeBytes: number;
    };

    const attachment = await prisma.attachment.create({
      data: { orgId, issueId, uploaderId: userId, filename, mimeType, sizeBytes, s3Key },
      include: { uploader: { select: { id: true, fullName: true } } },
    });

    reply.status(201).send({ data: attachment, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /attachments/:attachmentId/download — get presigned download URL
  app.get('/attachments/:attachmentId/download', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Get presigned download URL', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { attachmentId } = request.params as { attachmentId: string };
    const orgId = request.jwtPayload!.orgId;

    const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, orgId } });
    if (!attachment) {
      reply.status(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'Attachment not found' } });
      return;
    }

    const s3 = getS3Client();
    if (!s3 || !env.S3_BUCKET) {
      reply.status(503).send({ data: null, error: { code: 'INTERNAL_ERROR', message: 'File storage not configured' } });
      return;
    }

    const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: attachment.s3Key });
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    reply.send({ data: { downloadUrl }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /attachments/:attachmentId
  app.delete('/attachments/:attachmentId', {
    preHandler: [app.authenticate],
    schema: { tags: ['Issues'], summary: 'Delete attachment', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { attachmentId } = request.params as { attachmentId: string };
    const orgId = request.jwtPayload!.orgId;

    const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, orgId } });
    if (!attachment) {
      reply.status(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'Attachment not found' } });
      return;
    }

    const s3 = getS3Client();
    if (s3 && env.S3_BUCKET) {
      await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: attachment.s3Key }));
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });
    reply.send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

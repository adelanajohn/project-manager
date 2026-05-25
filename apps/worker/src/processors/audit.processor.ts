import type { Job } from 'bullmq';
import { prisma } from '@pm/db';
import pino from 'pino';

const logger = pino({ level: 'info' });

export async function auditProcessor(job: Job) {
  const log = logger.child({ correlationId: job.data.correlationId, jobId: job.id });

  const { action, actorId, actorRole, orgId, resourceType, resourceId, metadata, ipAddress, userAgent } = job.data;

  await prisma.auditLog.create({
    data: {
      orgId,
      actorId,
      actorRole,
      action,
      resourceType: resourceType ?? 'unknown',
      resourceId,
      metadata,
      ipAddress,
      userAgent,
    },
  });

  log.debug({ action, actorId }, 'Audit log written');
}

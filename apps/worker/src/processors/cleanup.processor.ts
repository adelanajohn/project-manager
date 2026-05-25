import type { Job } from 'bullmq';
import { prisma } from '@pm/db';
import pino from 'pino';

const logger = pino({ level: 'info' });

export async function cleanupProcessor(job: Job) {
  const log = logger.child({ jobId: job.id, queue: 'cleanup' });
  log.info('Cleanup job started');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Hard delete soft-deleted issues older than 30 days
  const deletedIssues = await prisma.issue.deleteMany({
    where: { deletedAt: { lt: thirtyDaysAgo } },
  });

  // Hard delete soft-deleted docs older than 30 days
  const deletedDocs = await prisma.doc.deleteMany({
    where: { deletedAt: { lt: thirtyDaysAgo } },
  });

  // Prune expired sessions
  const deletedSessions = await prisma.session.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: thirtyDaysAgo } }] },
  });

  log.info({ deletedIssues: deletedIssues.count, deletedDocs: deletedDocs.count, deletedSessions: deletedSessions.count }, 'Cleanup complete');
}

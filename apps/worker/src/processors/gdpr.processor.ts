import type { Job } from 'bullmq';
import { prisma } from '@pm/db';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface GdprJobData {
  correlationId: string;
  type: 'delete_user' | 'export_user' | 'delete_org';
  userId?: string;
  orgId?: string;
  requestedBy: string;
}

/**
 * Handles GDPR data deletion and export requests.
 *
 * delete_user: Anonymises PII, removes sessions, purges identifiable data.
 *              Retains audit log entries with actor replaced by anonymised ID.
 * export_user: Collects all user data into a JSON bundle.
 * delete_org:  Hard-deletes the org and all cascade-deleted tenant data.
 */
export async function gdprProcessor(job: Job<GdprJobData>) {
  const log = logger.child({ correlationId: job.data.correlationId, jobId: job.id, queue: 'gdpr' });

  switch (job.data.type) {
    case 'delete_user': {
      const { userId } = job.data;
      if (!userId) throw new Error('userId required for delete_user');

      log.info({ userId }, 'Anonymising user data');

      // Anonymise user — replace PII with placeholder
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.invalid`,
          fullName: '[Deleted User]',
          avatarUrl: null,
          passwordHash: '',
          mfaSecret: null,
          emailVerifiedAt: null,
        },
      });

      // Revoke all sessions
      await prisma.session.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });

      // Delete API keys
      await prisma.apiKey.deleteMany({ where: { userId } });

      // Delete notifications
      await prisma.notification.deleteMany({ where: { userId } });

      // Soft-delete comments (retain for thread integrity but remove body)
      await prisma.comment.updateMany({
        where: { authorId: userId },
        data: { body: { text: '[Deleted]' } as any, deletedAt: new Date() },
      });

      // Remove org memberships
      await prisma.orgMember.deleteMany({ where: { userId } });

      log.info({ userId }, 'User data anonymised');
      break;
    }

    case 'export_user': {
      const { userId } = job.data;
      if (!userId) throw new Error('userId required for export_user');

      log.info({ userId }, 'Exporting user data');

      const [user, memberships, issues, comments, timeLogs] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, fullName: true, createdAt: true, lastLoginAt: true },
        }),
        prisma.orgMember.findMany({
          where: { userId },
          include: { organization: { select: { name: true, slug: true } } },
        }),
        prisma.issue.findMany({
          where: { reporterId: userId, deletedAt: null },
          select: { issueKey: true, title: true, type: true, createdAt: true },
        }),
        prisma.comment.findMany({
          where: { authorId: userId, deletedAt: null },
          select: { body: true, createdAt: true },
        }),
        prisma.timeLog.findMany({
          where: { userId },
          select: { durationMin: true, description: true, loggedAt: true },
        }),
      ]);

      const exportBundle = { user, memberships, issues, comments, timeLogs };

      // TODO: upload to S3 and email download link
      log.info({ userId, recordCount: issues.length + comments.length }, 'User data export prepared');
      return exportBundle;
    }

    case 'delete_org': {
      const { orgId } = job.data;
      if (!orgId) throw new Error('orgId required for delete_org');

      log.info({ orgId }, 'Deleting organization');

      // Prisma CASCADE handles most child records
      await prisma.organization.delete({ where: { id: orgId } });

      log.info({ orgId }, 'Organization deleted');
      break;
    }

    default:
      throw new Error(`Unknown GDPR job type: ${(job.data as any).type}`);
  }
}

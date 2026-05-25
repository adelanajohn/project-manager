import type { Job } from 'bullmq';
import { prisma } from '@pm/db';
import pino from 'pino';

const logger = pino({ level: 'info' });

export async function notificationProcessor(job: Job) {
  const log = logger.child({ correlationId: job.data.correlationId, jobId: job.id, queue: 'notifications' });
  log.info('Processing notification job');

  const { issueId, orgId, actorId, type = job.name } = job.data;

  try {
    // Get issue details
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, orgId },
      include: {
        assignee: true,
        reporter: true,
        project: true,
      },
    });

    if (!issue) {
      log.warn({ issueId }, 'Issue not found for notification');
      return;
    }

    // Determine recipients (assignee + reporter, excluding actor)
    const recipientIds = new Set<string>();
    if (issue.assigneeId && issue.assigneeId !== actorId) recipientIds.add(issue.assigneeId);
    if (issue.reporterId && issue.reporterId !== actorId) recipientIds.add(issue.reporterId);

    if (recipientIds.size === 0) return;

    const notificationType = type.replace('issue-', 'issue.') as string;
    const notifications = Array.from(recipientIds).map((userId) => ({
      userId,
      orgId,
      type: notificationType,
      payload: {
        issueId: issue.id,
        issueKey: issue.issueKey,
        title: issue.title,
        projectName: issue.project.name,
        actorId,
        changes: job.data.changes,
      },
    }));

    await prisma.notification.createMany({ data: notifications });
    log.info({ count: notifications.length }, 'Notifications created');
  } catch (err) {
    log.error({ err }, 'Notification processor error');
    throw err;
  }
}

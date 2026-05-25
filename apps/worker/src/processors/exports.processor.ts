import type { Job } from 'bullmq';
import { prisma } from '@pm/db';
import pino from 'pino';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const logger = pino({ level: 'info' });

interface ExportJobData {
  correlationId: string;
  orgId: string;
  userId: string;
  projectId: string;
  type: 'csv' | 'json';
  filters?: Record<string, string>;
}

/**
 * Generates a CSV/JSON export of project issues.
 * In production: upload to S3 and deliver a presigned download URL via email.
 * In dev: writes to /tmp.
 */
export async function exportsProcessor(job: Job<ExportJobData>) {
  const log = logger.child({ correlationId: job.data.correlationId, jobId: job.id });
  const { orgId, userId, projectId, type } = job.data;

  log.info({ projectId, type }, 'Generating export');

  const issues = await prisma.issue.findMany({
    where: { projectId, orgId, deletedAt: null },
    include: {
      status: { select: { name: true, category: true } },
      assignee: { select: { fullName: true, email: true } },
      reporter: { select: { fullName: true, email: true } },
      sprint: { select: { name: true } },
      epic: { select: { title: true } },
    },
    orderBy: { rank: 'asc' },
  });

  const dir = tmpdir();
  const filename = `export-${projectId}-${randomUUID().slice(0, 8)}.${type}`;
  const filepath = join(dir, filename);

  if (type === 'json') {
    const { writeFileSync } = await import('fs');
    writeFileSync(filepath, JSON.stringify(issues, null, 2), 'utf-8');
  } else {
    // CSV
    const headers = ['issueKey', 'title', 'type', 'status', 'priority', 'assignee', 'reporter', 'sprint', 'epic', 'estimate', 'dueDate', 'createdAt'];
    const rows = issues.map((i) => [
      i.issueKey,
      `"${i.title.replace(/"/g, '""')}"`,
      i.type,
      i.status?.name ?? '',
      i.priority,
      i.assignee?.fullName ?? '',
      i.reporter?.fullName ?? '',
      i.sprint?.name ?? '',
      i.epic?.title ?? '',
      i.estimate ?? '',
      i.dueDate?.toISOString() ?? '',
      i.createdAt.toISOString(),
    ].join(','));

    const { writeFileSync } = await import('fs');
    writeFileSync(filepath, [headers.join(','), ...rows].join('\n'), 'utf-8');
  }

  log.info({ filepath, count: issues.length }, 'Export generated');

  // TODO: in production, upload to S3 and send download link via email
  return { filepath, count: issues.length };
}

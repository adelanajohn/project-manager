import type { Job } from 'bullmq';
import { prisma } from '@pm/db';
import pino from 'pino';

const logger = pino({ level: 'info' });

export async function analyticsProcessor(job: Job) {
  const log = logger.child({ correlationId: job.data.correlationId, jobId: job.id });
  log.info({ jobName: job.name }, 'Analytics job started');

  if (job.name === 'burndown') {
    const { sprintId, projectId, orgId } = job.data;

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { issues: { include: { status: true } } },
    });

    if (!sprint) return;

    const totalPoints = sprint.issues.reduce((s, i) => s + (i.estimate ?? 0), 0);
    const donePoints = sprint.issues
      .filter((i) => i.status?.category === 'done')
      .reduce((s, i) => s + (i.estimate ?? 0), 0);

    log.info({ sprintId, totalPoints, donePoints }, 'Burndown computed');
  }
}

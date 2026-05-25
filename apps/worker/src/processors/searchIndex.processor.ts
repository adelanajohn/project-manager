import type { Job } from 'bullmq';
import pino from 'pino';

const logger = pino({ level: 'info' });

export async function searchIndexProcessor(job: Job) {
  const log = logger.child({ correlationId: job.data.correlationId, jobId: job.id });
  const { type, id, orgId } = job.data;

  // Placeholder — in production this would update a tsvector column or Elasticsearch
  log.debug({ type, id, orgId }, 'Search index update (noop in dev)');
}

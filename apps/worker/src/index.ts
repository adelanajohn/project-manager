import { Worker } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';

import { notificationProcessor } from './processors/notification.processor.js';
import { emailProcessor } from './processors/email.processor.js';
import { auditProcessor } from './processors/audit.processor.js';
import { searchIndexProcessor } from './processors/searchIndex.processor.js';
import { analyticsProcessor } from './processors/analytics.processor.js';
import { cleanupProcessor } from './processors/cleanup.processor.js';
import { webhooksProcessor } from './processors/webhooks.processor.js';
import { exportsProcessor } from './processors/exports.processor.js';
import { gdprProcessor } from './processors/gdpr.processor.js';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
});

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

await connection.connect();
logger.info('Worker Redis connected');

const QUEUE_CONFIGS: Array<{ name: string; processor: (job: any) => Promise<unknown>; concurrency?: number; attempts?: number }> = [
  { name: 'notifications',  processor: notificationProcessor,  concurrency: 10, attempts: 3 },
  { name: 'email',          processor: emailProcessor,          concurrency: 5,  attempts: 5 },
  { name: 'audit',          processor: auditProcessor,          concurrency: 20, attempts: 5 },
  { name: 'search-index',   processor: searchIndexProcessor,    concurrency: 10, attempts: 3 },
  { name: 'analytics',      processor: analyticsProcessor,      concurrency: 3,  attempts: 2 },
  { name: 'cleanup',        processor: cleanupProcessor,        concurrency: 1,  attempts: 1 },
  { name: 'webhooks',       processor: webhooksProcessor,       concurrency: 10, attempts: 5 },
  { name: 'exports',        processor: exportsProcessor,        concurrency: 3,  attempts: 2 },
  { name: 'automations',    processor: async () => { /* TODO */ },  concurrency: 5,  attempts: 3 },
  { name: 'gdpr',           processor: gdprProcessor,           concurrency: 1,  attempts: 2 },
];

const workers: Worker[] = [];

for (const config of QUEUE_CONFIGS) {
  const worker = new Worker(config.name, config.processor, {
    connection,
    concurrency: config.concurrency ?? 5,
    defaultJobOptions: {
      attempts: config.attempts ?? 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  });

  worker.on('completed', (job) => {
    logger.info({
      jobId: job.id,
      queue: config.name,
      durationMs: Date.now() - job.timestamp,
    }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({
      jobId: job?.id,
      queue: config.name,
      err,
      attemptsMade: job?.attemptsMade,
    }, 'Job failed');
  });

  workers.push(worker);
}

const queueNames = QUEUE_CONFIGS.map((c) => c.name);
logger.info({ queues: queueNames }, `${workers.length} workers started`);

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down workers gracefully…');
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

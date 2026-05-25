import { Worker } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { notificationProcessor } from './processors/notification.processor.js';
import { emailProcessor } from './processors/email.processor.js';
import { auditProcessor } from './processors/audit.processor.js';
import { searchIndexProcessor } from './processors/searchIndex.processor.js';
import { analyticsProcessor } from './processors/analytics.processor.js';
import { cleanupProcessor } from './processors/cleanup.processor.js';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
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

const workers: Worker[] = [];

function createWorker(queueName: string, processor: (job: any) => Promise<unknown>) {
  const worker = new Worker(queueName, processor, {
    connection,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: queueName, durationMs: Date.now() - job.timestamp }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, queue: queueName, err, attemptsMade: job?.attemptsMade }, 'Job failed');
  });

  workers.push(worker);
  return worker;
}

createWorker('notifications', notificationProcessor);
createWorker('email', emailProcessor);
createWorker('audit', auditProcessor);
createWorker('search-index', searchIndexProcessor);
createWorker('analytics', analyticsProcessor);
createWorker('cleanup', cleanupProcessor);

logger.info({ queues: ['notifications', 'email', 'audit', 'search-index', 'analytics', 'cleanup'] }, 'Workers started');

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

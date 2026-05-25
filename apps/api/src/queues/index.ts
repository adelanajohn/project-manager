import { Queue } from 'bullmq';
import { redis } from '../redis.js';

const connection = redis;

export const notificationQueue = new Queue('notifications', { connection });
export const emailQueue = new Queue('email', { connection });
export const analyticsQueue = new Queue('analytics', { connection });
export const searchIndexQueue = new Queue('search-index', { connection });
export const webhookQueue = new Queue('webhooks', { connection });
export const cleanupQueue = new Queue('cleanup', { connection });
export const auditQueue = new Queue('audit', { connection });
export const exportsQueue = new Queue('exports', { connection });
export const automationsQueue = new Queue('automations', { connection });
export const gdprQueue = new Queue('gdpr', { connection });

export const allQueues = [
  notificationQueue,
  emailQueue,
  analyticsQueue,
  searchIndexQueue,
  webhookQueue,
  cleanupQueue,
  auditQueue,
  exportsQueue,
  automationsQueue,
  gdprQueue,
];

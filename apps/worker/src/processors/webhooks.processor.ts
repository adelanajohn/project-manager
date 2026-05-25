import type { Job } from 'bullmq';
import pino from 'pino';

const logger = pino({ level: 'info' });

interface WebhookJobData {
  correlationId: string;
  url: string;
  event: string;
  payload: unknown;
  secret?: string;
  orgId: string;
}

/**
 * Delivers outbound webhook events to subscriber URLs.
 * Signs the payload with HMAC-SHA256 if a secret is provided.
 */
export async function webhooksProcessor(job: Job<WebhookJobData>) {
  const log = logger.child({ correlationId: job.data.correlationId, jobId: job.id, queue: 'webhooks' });
  const { url, event, payload, secret, orgId } = job.data;

  log.info({ url, event, orgId }, 'Delivering webhook');

  let signature: string | undefined;
  if (secret) {
    const { createHmac } = await import('crypto');
    const body = JSON.stringify(payload);
    signature = createHmac('sha256', secret).update(body).digest('hex');
  }

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    orgId,
    payload,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PM-Event': event,
        'X-PM-Timestamp': new Date().toISOString(),
        ...(signature ? { 'X-PM-Signature': `sha256=${signature}` } : {}),
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Webhook delivery failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
    }

    log.info({ url, status: res.status, event }, 'Webhook delivered');
  } finally {
    clearTimeout(timeout);
  }
}

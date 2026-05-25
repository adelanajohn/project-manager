import { randomUUID } from 'crypto';

export function generateCorrelationId(prefix = 'req'): string {
  return `${prefix}_${randomUUID()}`;
}

export function generateClientCorrelationId(): string {
  return generateCorrelationId('client');
}

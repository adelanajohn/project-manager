import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getApp, closeApp } from './helpers';

describe('Health endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => { app = await getApp(); });
  afterAll(async () => { await closeApp(); });

  it('GET /health returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('ok');
  });

  it('returns X-Correlation-Id header on every response', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-correlation-id']).toBeTruthy();
  });

  it('echoes provided X-Correlation-Id', async () => {
    const id = 'test-correlation-123';
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-correlation-id': id },
    });
    expect(res.headers['x-correlation-id']).toBe(id);
  });
});

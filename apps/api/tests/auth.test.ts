import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getApp, closeApp, createTestUser, cleanupUser } from './helpers';

describe('Auth routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('creates a new user account', async () => {
      const email = `signup-test-${Date.now()}@example.com`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: {
          email,
          password: 'Password123!',
          fullName: 'Signup Test User',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.user.email).toBe(email);
      expect(body.error).toBeNull();
    });

    it('rejects weak passwords', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: 'weak@example.com', password: 'short', fullName: 'Test' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects duplicate email', async () => {
      const email = `dup-${Date.now()}@example.com`;
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email, password: 'Password123!', fullName: 'First' },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email, password: 'Password123!', fullName: 'Second' },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testEmail: string;
    let testUserId: string;

    beforeAll(async () => {
      const { user, email } = await createTestUser();
      testEmail = email;
      testUserId = user.id;
    });

    afterAll(async () => {
      await cleanupUser(testUserId);
    });

    it('returns access token on valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: testEmail, password: 'Password123!' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.accessToken).toBeTruthy();
      expect(body.data.user.email).toBe(testEmail);

      // Refresh token should be set as HttpOnly cookie
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeTruthy();
      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);
      expect(cookieStr).toContain('refresh_token');
      expect(cookieStr).toContain('HttpOnly');
    });

    it('rejects invalid password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: testEmail, password: 'WrongPassword123!' },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects nonexistent email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'nobody@example.com', password: 'Password123!' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects malformed email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'not-an-email', password: 'Password123!' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns current user with valid token', async () => {
      const { user, email } = await createTestUser();

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'Password123!' },
      });
      const { accessToken } = JSON.parse(loginRes.body).data;

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(meRes.statusCode).toBe(200);
      const body = JSON.parse(meRes.body);
      expect(body.data.id).toBe(user.id);
      expect(body.data.email).toBe(email);

      await cleanupUser(user.id);
    });

    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: 'Bearer invalid.jwt.token' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('revokes the session', async () => {
      const { email } = await createTestUser();

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'Password123!' },
      });
      const { accessToken } = JSON.parse(loginRes.body).data;

      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(logoutRes.statusCode).toBe(200);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns success even for unknown email (no enumeration)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'nonexistent@example.com' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.success).toBe(true);
    });
  });
});

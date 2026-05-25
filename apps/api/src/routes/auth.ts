import type { FastifyInstance } from 'fastify';
import { authService } from '../services/auth.service.js';
import {
  SignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '@pm/shared';
import { zodToJsonSchema } from 'zod-to-json-schema';

const REFRESH_COOKIE = 'refresh_token';
const SESSION_COOKIE = 'session_id';

export default async function authRoutes(app: FastifyInstance) {
  // POST /auth/signup
  app.post('/signup', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Create account',
      body: zodToJsonSchema(SignupSchema),
    },
  }, async (request, reply) => {
    const input = SignupSchema.parse(request.body);
    const result = await authService.signup(input, request.ip);
    reply.status(201).send({ data: result, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /auth/verify-email/:token
  app.post('/verify-email/:token', {
    schema: { tags: ['Auth'], summary: 'Verify email address' },
  }, async (request, reply) => {
    const { token } = request.params as { token: string };
    const result = await authService.verifyEmail(token);
    reply.send({ data: result, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /auth/login
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Login',
      body: zodToJsonSchema(LoginSchema),
    },
  }, async (request, reply) => {
    const input = LoginSchema.parse(request.body);
    const result = await authService.login(input, request.headers['user-agent'], request.ip);

    reply
      .setCookie(REFRESH_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60,
      })
      .setCookie(SESSION_COOKIE, result.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60,
      })
      .send({
        data: { accessToken: result.accessToken, user: result.user },
        meta: { requestId: request.correlationId, timestamp: new Date().toISOString() },
        error: null,
      });
  });

  // POST /auth/refresh
  app.post('/refresh', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: { tags: ['Auth'], summary: 'Refresh access token' },
  }, async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE];
    const sessionId = request.cookies[SESSION_COOKIE];

    if (!refreshToken || !sessionId) {
      reply.status(401).send({ data: null, error: { code: 'UNAUTHORIZED', message: 'Missing refresh token' } });
      return;
    }

    const result = await authService.refresh(refreshToken, sessionId, request.ip);

    reply
      .setCookie(REFRESH_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60,
      })
      .setCookie(SESSION_COOKIE, result.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60,
      })
      .send({
        data: { accessToken: result.accessToken },
        meta: { requestId: request.correlationId, timestamp: new Date().toISOString() },
        error: null,
      });
  });

  // POST /auth/logout
  app.post('/logout', {
    preHandler: [app.authenticate],
    schema: { tags: ['Auth'], summary: 'Logout' },
  }, async (request, reply) => {
    const sessionId = request.jwtPayload!.sessionId;
    await authService.logout(sessionId);
    reply
      .clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' })
      .clearCookie(SESSION_COOKIE, { path: '/api/v1/auth' })
      .send({ data: { success: true }, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /auth/forgot-password
  app.post('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Request password reset email',
      body: zodToJsonSchema(ForgotPasswordSchema),
    },
  }, async (request, reply) => {
    const input = ForgotPasswordSchema.parse(request.body);
    const result = await authService.forgotPassword(input, request.ip);
    reply.send({ data: result, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // POST /auth/reset-password
  app.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Auth'],
      summary: 'Reset password with token',
      body: zodToJsonSchema(ResetPasswordSchema),
    },
  }, async (request, reply) => {
    const input = ResetPasswordSchema.parse(request.body);
    const result = await authService.resetPassword(input, request.ip);
    reply.send({ data: result, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /auth/sessions
  app.get('/sessions', {
    preHandler: [app.authenticate],
    schema: { tags: ['Auth'], summary: 'List active sessions', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const sessions = await authService.listSessions(request.jwtPayload!.sub);
    reply.send({ data: sessions, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // DELETE /auth/sessions/:id
  app.delete('/sessions/:id', {
    preHandler: [app.authenticate],
    schema: { tags: ['Auth'], summary: 'Revoke a session', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await authService.revokeSession(request.jwtPayload!.sub, id);
    reply.send({ data: result, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });

  // GET /auth/me
  app.get('/me', {
    preHandler: [app.authenticate],
    schema: { tags: ['Auth'], summary: 'Get current user', security: [{ bearerAuth: [] }] },
  }, async (request, reply) => {
    const { prisma } = await import('@pm/db');
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.jwtPayload!.sub },
      select: {
        id: true, email: true, fullName: true, avatarUrl: true,
        platformRole: true, emailVerifiedAt: true, lastLoginAt: true, createdAt: true,
      },
    });
    reply.send({ data: user, meta: { requestId: request.correlationId, timestamp: new Date().toISOString() }, error: null });
  });
}

import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';
import { redis } from '../redis.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { signAccessToken } from '../jwt.js';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  /** Required if the user doesn't have an account yet */
  fullName: z.string().min(1).optional(),
  password: z
    .string()
    .min(12)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .optional(),
});

export default async function inviteRoutes(app: FastifyInstance) {
  /** GET /invites/:token — preview invite details before accepting */
  app.get('/invites/:token', {
    schema: { tags: ['Auth'], summary: 'Preview invite' },
  }, async (request, reply) => {
    const { token } = request.params as { token: string };
    const raw = await redis.get(`invite:${token}`);
    if (!raw) {
      reply.status(404).send({ data: null, error: { code: 'NOT_FOUND', message: 'Invite not found or expired' } });
      return;
    }

    const invite = JSON.parse(raw) as { orgId: string; email: string; role: string };
    const org = await prisma.organization.findUnique({
      where: { id: invite.orgId },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });

    const userExists = !!(await prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } }));

    reply.send({
      data: { org, email: invite.email, role: invite.role, userExists },
      meta: { requestId: request.correlationId, timestamp: new Date().toISOString() },
      error: null,
    });
  });

  /** POST /invites/accept — accept an invite */
  app.post('/invites/accept', {
    schema: {
      tags: ['Auth'],
      summary: 'Accept invite',
      body: zodToJsonSchema(AcceptInviteSchema),
    },
  }, async (request, reply) => {
    const input = AcceptInviteSchema.parse(request.body);
    const raw = await redis.get(`invite:${input.token}`);

    if (!raw) {
      reply.status(400).send({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Invite token is invalid or has expired' } });
      return;
    }

    const invite = JSON.parse(raw) as { orgId: string; email: string; role: string };

    // Get or create user
    let user = await prisma.user.findUnique({ where: { email: invite.email } });

    if (!user) {
      if (!input.fullName || !input.password) {
        reply.status(400).send({
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'fullName and password are required for new accounts' },
        });
        return;
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      user = await prisma.user.create({
        data: {
          email: invite.email,
          fullName: input.fullName,
          passwordHash,
          emailVerifiedAt: new Date(), // auto-verified via invite
        },
      });
    }

    // Create or update membership
    await prisma.orgMember.upsert({
      where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
      update: { role: invite.role as any },
      create: { orgId: invite.orgId, userId: user.id, role: invite.role as any },
    });

    // Consume the invite token
    await redis.del(`invite:${input.token}`);

    // Issue a session + tokens
    const sessionId = randomUUID();
    const refreshToken = randomUUID();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        tokenFamily: randomUUID(),
        ipAddress: request.ip,
        expiresAt,
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      orgId: invite.orgId,
      role: invite.role as any,
      platformRole: user.platformRole,
      sessionId,
    });

    reply
      .setCookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60,
      })
      .setCookie('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 7 * 24 * 60 * 60,
      })
      .send({
        data: {
          accessToken,
          user: { id: user.id, email: user.email, fullName: user.fullName },
          orgId: invite.orgId,
        },
        meta: { requestId: request.correlationId, timestamp: new Date().toISOString() },
        error: null,
      });
  });
}

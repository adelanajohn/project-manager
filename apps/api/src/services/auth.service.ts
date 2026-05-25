import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { prisma } from '@pm/db';
import { redis } from '../redis.js';
import { signAccessToken } from '../jwt.js';
import { env } from '../env.js';
import logger from '../logger.js';
import { emailQueue, auditQueue } from '../queues/index.js';
import type { SignupInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, RequestContext } from '@pm/shared';

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes
const PASSWORD_RESET_EXPIRY_SECONDS = 60 * 60; // 1 hour
const EMAIL_VERIFY_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

export const authService = {
  async signup(input: SignupInput, ipAddress?: string) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw Object.assign(new Error('Email already in use'), { statusCode: 409, code: 'CONFLICT' });
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const verifyToken = randomUUID();

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
      },
    });

    // Store email verification token
    await redis.setex(`email_verify:${verifyToken}`, EMAIL_VERIFY_EXPIRY_SECONDS, user.id);

    // Queue verification email
    await emailQueue.add('verify-email', {
      correlationId: `signup_${user.id}`,
      to: user.email,
      subject: 'Verify your email',
      template: 'verify-email',
      data: {
        fullName: user.fullName,
        verifyUrl: `${env.APP_URL}/verify-email/${verifyToken}`,
      },
    });

    // Create org if orgName provided
    let org: { id: string; name: string; slug: string } | null = null;
    if (input.orgName) {
      const { toSlug } = await import('@pm/shared');
      const slug = toSlug(input.orgName);
      org = await prisma.organization.create({
        data: {
          name: input.orgName,
          slug: `${slug}-${randomUUID().slice(0, 8)}`,
          members: {
            create: { userId: user.id, role: 'tenant_admin' },
          },
        },
      });
    }

    await auditQueue.add('log', {
      correlationId: `signup_${user.id}`,
      action: 'user.signup',
      actorId: user.id,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
    });

    return { user: { id: user.id, email: user.email, fullName: user.fullName }, org };
  },

  async verifyEmail(token: string) {
    const userId = await redis.get(`email_verify:${token}`);
    if (!userId) {
      throw Object.assign(new Error('Invalid or expired verification token'), { statusCode: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });

    await redis.del(`email_verify:${token}`);
    return { success: true };
  },

  async login(input: LoginInput, deviceInfo?: string, ipAddress?: string) {
    const lockKey = `lockout:${input.email}`;
    const attemptsKey = `attempts:${input.email}`;

    // Check lockout
    const locked = await redis.get(lockKey);
    if (locked) {
      throw Object.assign(new Error('Account locked due to too many failed attempts. Try again in 15 minutes.'), {
        statusCode: 429,
        code: 'RATE_LIMITED',
      });
    }

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      await this._recordFailedAttempt(attemptsKey, lockKey, input.email, ipAddress);
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      await this._recordFailedAttempt(attemptsKey, lockKey, input.email, ipAddress, user.id);
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    // Clear failed attempts on success
    await redis.del(attemptsKey);
    await redis.del(lockKey);

    const tokenFamily = randomUUID();
    const refreshToken = randomUUID();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const sessionId = randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        tokenFamily,
        deviceInfo,
        ipAddress,
        expiresAt,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get primary org membership
    const membership = await prisma.orgMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: 'asc' },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      orgId: membership?.orgId ?? '',
      role: membership?.role ?? null,
      platformRole: user.platformRole,
      sessionId,
    });

    await auditQueue.add('log', {
      correlationId: `login_${user.id}`,
      action: 'user.login',
      actorId: user.id,
      orgId: membership?.orgId,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
    });

    return { accessToken, refreshToken, sessionId, user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      platformRole: user.platformRole,
    }};
  },

  async refresh(refreshToken: string, sessionId: string, ipAddress?: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw Object.assign(new Error('Session expired or revoked'), { statusCode: 401 });
    }

    const valid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!valid) {
      // Possible token theft — invalidate entire family
      await prisma.session.updateMany({
        where: { tokenFamily: session.tokenFamily },
        data: { revokedAt: new Date() },
      });
      throw Object.assign(new Error('Token reuse detected. All sessions invalidated.'), { statusCode: 401 });
    }

    const newRefreshToken = randomUUID();
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    const newSessionId = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Revoke old, create new
    await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
    const membership = await prisma.orgMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: 'asc' },
    });

    await prisma.session.create({
      data: {
        id: newSessionId,
        userId: user.id,
        refreshTokenHash: newRefreshTokenHash,
        tokenFamily: session.tokenFamily,
        deviceInfo: session.deviceInfo,
        ipAddress,
        expiresAt,
      },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      orgId: membership?.orgId ?? '',
      role: membership?.role ?? null,
      platformRole: user.platformRole,
      sessionId: newSessionId,
    });

    return { accessToken, refreshToken: newRefreshToken, sessionId: newSessionId };
  },

  async logout(sessionId: string) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await redis.setex(`blacklist:${sessionId}`, 60 * 60, '1');
  },

  async forgotPassword(input: ForgotPasswordInput, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Always return success to prevent email enumeration
    if (!user) return { success: true };

    const token = randomUUID();
    await redis.setex(`pwd_reset:${token}`, PASSWORD_RESET_EXPIRY_SECONDS, user.id);

    await emailQueue.add('password-reset', {
      correlationId: `pwd_reset_${user.id}`,
      to: user.email,
      subject: 'Reset your password',
      template: 'password-reset',
      data: {
        fullName: user.fullName,
        resetUrl: `${env.APP_URL}/reset-password/${token}`,
      },
    });

    await auditQueue.add('log', {
      action: 'user.password_reset_requested',
      actorId: user.id,
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
    });

    return { success: true };
  },

  async resetPassword(input: ResetPasswordInput, ipAddress?: string) {
    const userId = await redis.get(`pwd_reset:${input.token}`);
    if (!userId) {
      throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 });
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Revoke all sessions
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await redis.del(`pwd_reset:${input.token}`);

    await auditQueue.add('log', {
      action: 'user.password_reset',
      actorId: userId,
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
    });

    return { success: true };
  },

  async listSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, deviceInfo: true, ipAddress: true, lastUsedAt: true, createdAt: true },
      orderBy: { lastUsedAt: 'desc' },
    });
  },

  async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw Object.assign(new Error('Session not found'), { statusCode: 404 });
    }
    await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    await redis.setex(`blacklist:${sessionId}`, 60 * 60, '1');
    return { success: true };
  },

  async _recordFailedAttempt(
    attemptsKey: string,
    lockKey: string,
    email: string,
    ipAddress?: string,
    userId?: string
  ) {
    const attempts = await redis.incr(attemptsKey);
    await redis.expire(attemptsKey, LOCKOUT_DURATION_SECONDS);

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await redis.setex(lockKey, LOCKOUT_DURATION_SECONDS, '1');
      logger.warn({ email, ipAddress }, 'Account locked after too many failed attempts');
    }

    if (userId) {
      await auditQueue.add('log', {
        action: 'user.login_failed',
        actorId: userId,
        resourceType: 'user',
        resourceId: userId,
        ipAddress,
        metadata: { attempts },
      });
    }
  },
};

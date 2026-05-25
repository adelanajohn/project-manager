import { prisma } from '@pm/db';
import { can, PermissionError } from '@pm/shared';
import type { CreateOrgInput, UpdateOrgInput, InviteMemberInput, UpdateMemberRoleInput, RequestContext } from '@pm/shared';
import { emailQueue, auditQueue } from '../queues/index.js';
import { env } from '../env.js';
import { randomUUID } from 'crypto';
import { redis } from '../redis.js';

export const orgService = {
  async list(userId: string, platformRole: string | null | undefined) {
    if (platformRole === 'platform_admin') {
      return prisma.organization.findMany({
        include: { _count: { select: { members: true, projects: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    const memberships = await prisma.orgMember.findMany({
      where: { userId },
      include: { organization: { include: { _count: { select: { members: true, projects: true } } } } },
    });
    return memberships.map((m) => ({ ...m.organization, role: m.role }));
  },

  async create(input: CreateOrgInput, userId: string) {
    const existing = await prisma.organization.findUnique({ where: { slug: input.slug } });
    if (existing) throw Object.assign(new Error('Slug already taken'), { statusCode: 409, code: 'CONFLICT' });

    const org = await prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        members: { create: { userId, role: 'tenant_admin' } },
      },
    });

    await auditQueue.add('log', {
      correlationId: randomUUID(),
      action: 'org.created',
      actorId: userId,
      orgId: org.id,
      resourceType: 'organization',
      resourceId: org.id,
    });

    return org;
  },

  async getById(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { _count: { select: { members: true, projects: true } }, subscription: true },
    });
    if (!org) throw Object.assign(new Error('Organization not found'), { statusCode: 404 });
    return org;
  },

  async getBySlug(slug: string) {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { _count: { select: { members: true, projects: true } }, subscription: true },
    });
    if (!org) throw Object.assign(new Error('Organization not found'), { statusCode: 404 });
    return org;
  },

  async update(orgId: string, input: UpdateOrgInput, ctx: { userId: string; role: string | null }) {
    const userCtx = { tenantRole: ctx.role as any };
    if (!can(userCtx, 'manage:org_members')) throw new PermissionError('Insufficient permissions');

    if (input.slug) {
      const existing = await prisma.organization.findFirst({
        where: { slug: input.slug, NOT: { id: orgId } },
      });
      if (existing) throw Object.assign(new Error('Slug already taken'), { statusCode: 409 });
    }

    return prisma.organization.update({ where: { id: orgId }, data: input });
  },

  async delete(orgId: string, ctx: RequestContext) {
    const userCtx = { platformRole: ctx.platformRole as any, tenantRole: ctx.role as any };
    if (!can(userCtx, 'delete:tenant')) throw new PermissionError('Insufficient permissions');

    await prisma.organization.delete({ where: { id: orgId } });

    await auditQueue.add('log', {
      correlationId: ctx.correlationId,
      action: 'org.deleted',
      actorId: ctx.userId,
      orgId,
      resourceType: 'organization',
      resourceId: orgId,
    });

    return { success: true };
  },

  async listMembers(orgId: string, cursor?: string, limit = 25) {
    const members = await prisma.orgMember.findMany({
      where: { orgId },
      include: { user: { select: { id: true, email: true, fullName: true, avatarUrl: true, lastLoginAt: true } } },
      take: limit + 1,
      cursor: cursor ? { orgId_userId: { orgId, userId: cursor } } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { joinedAt: 'asc' },
    });

    const hasMore = members.length > limit;
    if (hasMore) members.pop();
    return { members, nextCursor: hasMore ? members[members.length - 1]?.userId ?? null : null };
  },

  async inviteMember(orgId: string, input: InviteMemberInput, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'manage:org_members')) throw new PermissionError('Insufficient permissions');

    // Find or prepare user
    let user = await prisma.user.findUnique({ where: { email: input.email } });
    const inviteToken = randomUUID();

    if (user) {
      // User exists — check if already a member
      const existing = await prisma.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: user.id } },
      });
      if (existing) throw Object.assign(new Error('User is already a member'), { statusCode: 409 });

      await prisma.orgMember.create({
        data: { orgId, userId: user.id, role: input.role, invitedBy: ctx.userId },
      });
    }

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

    // Store invite token for email link
    await redis.setex(`invite:${inviteToken}`, 7 * 24 * 60 * 60, JSON.stringify({ orgId, email: input.email, role: input.role }));

    await emailQueue.add('invite-member', {
      correlationId: ctx.correlationId,
      to: input.email,
      subject: `You've been invited to ${org.name}`,
      template: 'invite',
      data: {
        orgName: org.name,
        inviteUrl: `${env.APP_URL}/accept-invite/${inviteToken}`,
        role: input.role,
      },
    });

    await auditQueue.add('log', {
      correlationId: ctx.correlationId,
      action: 'member.invited',
      actorId: ctx.userId,
      actorRole: ctx.role,
      orgId,
      resourceType: 'org_member',
      metadata: { email: input.email, role: input.role },
    });

    return { success: true };
  },

  async updateMemberRole(orgId: string, targetUserId: string, input: UpdateMemberRoleInput, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'manage:org_members')) throw new PermissionError('Insufficient permissions');

    await prisma.orgMember.update({
      where: { orgId_userId: { orgId, userId: targetUserId } },
      data: { role: input.role },
    });

    await auditQueue.add('log', {
      correlationId: ctx.correlationId,
      action: 'member.role_changed',
      actorId: ctx.userId,
      orgId,
      resourceType: 'org_member',
      resourceId: targetUserId,
      metadata: { newRole: input.role },
    });

    return { success: true };
  },

  async removeMember(orgId: string, targetUserId: string, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'manage:org_members')) throw new PermissionError('Insufficient permissions');

    await prisma.orgMember.delete({
      where: { orgId_userId: { orgId, userId: targetUserId } },
    });

    await auditQueue.add('log', {
      correlationId: ctx.correlationId,
      action: 'member.removed',
      actorId: ctx.userId,
      orgId,
      resourceType: 'org_member',
      resourceId: targetUserId,
    });

    return { success: true };
  },
};

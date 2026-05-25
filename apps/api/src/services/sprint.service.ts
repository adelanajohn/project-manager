import { prisma } from '@pm/db';
import { can, PermissionError } from '@pm/shared';
import type { CreateSprintInput, UpdateSprintInput, CompleteSprintInput, RequestContext } from '@pm/shared';
import { analyticsQueue, auditQueue } from '../queues/index.js';

export const sprintService = {
  async list(projectId: string, orgId: string) {
    return prisma.sprint.findMany({
      where: { projectId, orgId },
      include: {
        _count: { select: { issues: true } },
        issues: {
          where: { deletedAt: null },
          select: { id: true, estimate: true, status: true, priority: true, statusId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(projectId: string, orgId: string, input: CreateSprintInput, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'manage:sprints')) throw new PermissionError('Insufficient permissions');

    return prisma.sprint.create({
      data: {
        projectId,
        orgId,
        name: input.name,
        goal: input.goal,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        status: 'planned',
      },
    });
  },

  async update(sprintId: string, orgId: string, input: UpdateSprintInput, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'manage:sprints')) throw new PermissionError('Insufficient permissions');

    return prisma.sprint.update({
      where: { id: sprintId },
      data: {
        name: input.name,
        goal: input.goal,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
    });
  },

  async start(sprintId: string, orgId: string, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'manage:sprints')) throw new PermissionError('Insufficient permissions');

    const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, orgId } });
    if (!sprint) throw Object.assign(new Error('Sprint not found'), { statusCode: 404 });
    if (sprint.status !== 'planned') throw Object.assign(new Error('Sprint is not in planned state'), { statusCode: 400 });

    // Check no other active sprint
    const activeSprint = await prisma.sprint.findFirst({
      where: { projectId: sprint.projectId, status: 'active' },
    });
    if (activeSprint) throw Object.assign(new Error('Another sprint is already active'), { statusCode: 400 });

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: 'active',
        startDate: sprint.startDate ?? new Date(),
      },
    });

    await auditQueue.add('log', {
      correlationId: ctx.correlationId,
      action: 'sprint.started',
      actorId: ctx.userId,
      orgId,
      resourceType: 'sprint',
      resourceId: sprintId,
    });

    return updated;
  },

  async complete(sprintId: string, orgId: string, input: CompleteSprintInput, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'manage:sprints')) throw new PermissionError('Insufficient permissions');

    const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, orgId } });
    if (!sprint) throw Object.assign(new Error('Sprint not found'), { statusCode: 404 });
    if (sprint.status !== 'active') throw Object.assign(new Error('Sprint is not active'), { statusCode: 400 });

    // Move incomplete issues
    const incompleteIssues = await prisma.issue.findMany({
      where: {
        sprintId,
        deletedAt: null,
        status: { category: { notIn: ['done', 'canceled'] } },
      },
    });

    if (input.incompleteIssueAction === 'backlog') {
      await prisma.issue.updateMany({
        where: { id: { in: incompleteIssues.map((i) => i.id) } },
        data: { sprintId: null },
      });
    } else if (input.incompleteIssueAction === 'next_sprint' && input.nextSprintId) {
      await prisma.issue.updateMany({
        where: { id: { in: incompleteIssues.map((i) => i.id) } },
        data: { sprintId: input.nextSprintId },
      });
    }

    const completed = await prisma.sprint.update({
      where: { id: sprintId },
      data: { status: 'completed', completedAt: new Date() },
    });

    // Trigger analytics recompute
    await analyticsQueue.add('burndown', {
      correlationId: ctx.correlationId,
      sprintId,
      projectId: sprint.projectId,
      orgId,
    });

    await auditQueue.add('log', {
      correlationId: ctx.correlationId,
      action: 'sprint.completed',
      actorId: ctx.userId,
      orgId,
      resourceType: 'sprint',
      resourceId: sprintId,
    });

    return { sprint: completed, movedIssues: incompleteIssues.length };
  },

  async getBurndown(sprintId: string, orgId: string) {
    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, orgId },
      include: {
        issues: {
          include: { status: true },
        },
      },
    });
    if (!sprint) throw Object.assign(new Error('Sprint not found'), { statusCode: 404 });

    const totalPoints = sprint.issues.reduce((s, i) => s + (i.estimate ?? 0), 0);
    const completedPoints = sprint.issues
      .filter((i) => i.status?.category === 'done')
      .reduce((s, i) => s + (i.estimate ?? 0), 0);

    return {
      sprint: { id: sprint.id, name: sprint.name, startDate: sprint.startDate, endDate: sprint.endDate },
      totalPoints,
      completedPoints,
      remainingPoints: totalPoints - completedPoints,
    };
  },
};

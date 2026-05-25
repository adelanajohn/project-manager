import { prisma } from '@pm/db';
import { can, PermissionError } from '@pm/shared';
import type { CreateProjectInput, UpdateProjectInput, CreateStatusInput, RequestContext } from '@pm/shared';
import { auditQueue } from '../queues/index.js';

export const projectService = {
  async list(orgId: string) {
    return prisma.project.findMany({
      where: { orgId },
      include: {
        _count: { select: { issues: { where: { deletedAt: null } }, members: true } },
        statuses: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async create(orgId: string, input: CreateProjectInput, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'create:project')) throw new PermissionError('Insufficient permissions');

    const existing = await prisma.project.findFirst({ where: { orgId, identifier: input.identifier } });
    if (existing) throw Object.assign(new Error('Project identifier already exists'), { statusCode: 409 });

    const project = await prisma.project.create({
      data: {
        orgId,
        name: input.name,
        description: input.description,
        identifier: input.identifier,
        type: input.type,
        color: input.color,
      },
    });

    // Create default statuses
    await prisma.projectStatusConfig.createMany({
      data: [
        { projectId: project.id, name: 'Backlog', color: '#64748B', category: 'backlog', position: 0 },
        { projectId: project.id, name: 'Todo', color: '#6366F1', category: 'todo', position: 1 },
        { projectId: project.id, name: 'In Progress', color: '#06B6D4', category: 'in_progress', position: 2 },
        { projectId: project.id, name: 'In Review', color: '#8B5CF6', category: 'in_progress', position: 3 },
        { projectId: project.id, name: 'Done', color: '#10B981', category: 'done', position: 4 },
        { projectId: project.id, name: 'Canceled', color: '#EF4444', category: 'canceled', position: 5 },
      ],
    });

    await auditQueue.add('log', {
      correlationId: ctx.correlationId,
      action: 'project.created',
      actorId: ctx.userId,
      actorRole: ctx.role,
      orgId,
      resourceType: 'project',
      resourceId: project.id,
    });

    return project;
  },

  async getById(projectId: string, orgId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId },
      include: {
        statuses: { orderBy: { position: 'asc' } },
        labels: true,
        _count: { select: { issues: { where: { deletedAt: null } }, members: true, sprints: true } },
      },
    });
    if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    return project;
  },

  async update(projectId: string, orgId: string, input: UpdateProjectInput, ctx: RequestContext) {
    const project = await this.getById(projectId, orgId);
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'manage:project_settings')) throw new PermissionError('Insufficient permissions');

    return prisma.project.update({ where: { id: project.id }, data: input });
  },

  async archive(projectId: string, orgId: string, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'archive:project')) throw new PermissionError('Insufficient permissions');

    await prisma.project.update({ where: { id: projectId }, data: { status: 'archived' } });

    await auditQueue.add('log', {
      correlationId: ctx.correlationId,
      action: 'project.archived',
      actorId: ctx.userId,
      orgId,
      resourceType: 'project',
      resourceId: projectId,
    });

    return { success: true };
  },

  async delete(projectId: string, orgId: string, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'archive:project')) throw new PermissionError('Insufficient permissions');

    await prisma.project.delete({ where: { id: projectId } });
    return { success: true };
  },

  async getBoard(projectId: string, orgId: string, filters: Record<string, string> = {}) {
    const project = await this.getById(projectId, orgId);

    const where: Record<string, unknown> = {
      projectId,
      orgId,
      deletedAt: null,
      type: { not: 'epic' },
    };

    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.priority) where.priority = filters.priority;
    if (filters.sprintId) where.sprintId = filters.sprintId;

    const issues = await prisma.issue.findMany({
      where,
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        reporter: { select: { id: true, fullName: true, avatarUrl: true } },
        status: true,
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
    });

    // Group by status
    const board: Record<string, typeof issues> = {};
    for (const status of project.statuses) {
      board[status.id] = issues.filter((i) => i.statusId === status.id);
    }

    return { statuses: project.statuses, board };
  },

  async getBacklog(projectId: string, orgId: string) {
    const issues = await prisma.issue.findMany({
      where: { projectId, orgId, deletedAt: null, sprintId: null, type: { not: 'epic' } },
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        status: true,
        epic: { select: { id: true, title: true, color: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { rank: 'asc' },
    });
    return issues;
  },

  async createStatus(projectId: string, orgId: string, input: CreateStatusInput, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'manage:project_settings')) throw new PermissionError('Insufficient permissions');

    return prisma.projectStatusConfig.create({
      data: { ...input, projectId },
    });
  },

  async getAnalytics(projectId: string, orgId: string) {
    const [totalIssues, issuesByStatus, issuesByPriority, issuesByType, sprints] = await Promise.all([
      prisma.issue.count({ where: { projectId, orgId, deletedAt: null } }),
      prisma.issue.groupBy({
        by: ['statusId'],
        where: { projectId, orgId, deletedAt: null },
        _count: true,
      }),
      prisma.issue.groupBy({
        by: ['priority'],
        where: { projectId, orgId, deletedAt: null },
        _count: true,
      }),
      prisma.issue.groupBy({
        by: ['type'],
        where: { projectId, orgId, deletedAt: null },
        _count: true,
      }),
      prisma.sprint.findMany({
        where: { projectId, orgId },
        include: { _count: { select: { issues: true } } },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
    ]);

    return { totalIssues, issuesByStatus, issuesByPriority, issuesByType, sprints };
  },
};

import { prisma } from '@pm/db';
import { can, PermissionError } from '@pm/shared';
import type { CreateIssueInput, UpdateIssueInput, UpdateIssueRankInput, CreateCommentInput, BulkUpdateIssuesInput, RequestContext } from '@pm/shared';
import { notificationQueue, auditQueue, searchIndexQueue } from '../queues/index.js';

const issueInclude = {
  assignee: { select: { id: true, fullName: true, avatarUrl: true } },
  reporter: { select: { id: true, fullName: true, avatarUrl: true } },
  status: true,
  epic: { select: { id: true, title: true, color: true } },
  sprint: { select: { id: true, name: true } },
  milestone: { select: { id: true, name: true } },
  parent: { select: { id: true, issueKey: true, title: true } },
  _count: { select: { comments: true, attachments: true, subtasks: true } },
};

export const issueService = {
  async list(projectId: string, orgId: string, filters: Record<string, string> = {}, cursor?: string, limit = 25) {
    const where: Record<string, unknown> = { projectId, orgId, deletedAt: null };

    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.priority) where.priority = filters.priority;
    if (filters.type) where.type = filters.type;
    if (filters.statusId) where.statusId = filters.statusId;
    if (filters.sprintId !== undefined) where.sprintId = filters.sprintId || null;
    if (filters.epicId) where.epicId = filters.epicId;
    if (filters.q) {
      (where as any).title = { contains: filters.q, mode: 'insensitive' };
    }

    const issues = await prisma.issue.findMany({
      where,
      include: issueInclude,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: [{ rank: 'asc' }, { createdAt: 'desc' }],
    });

    const hasMore = issues.length > limit;
    if (hasMore) issues.pop();

    return { issues, nextCursor: hasMore ? issues[issues.length - 1]?.id ?? null : null };
  },

  async create(projectId: string, orgId: string, input: CreateIssueInput, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'create:issue')) throw new PermissionError('Insufficient permissions');

    // Generate issue key
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const count = await prisma.issue.count({ where: { projectId } });
    const issueKey = `${project.identifier}-${count + 1}`;

    // Get max rank for ordering
    const maxRank = await prisma.issue.aggregate({
      where: { projectId, orgId },
      _max: { rank: true },
    });

    // Get default status if not provided
    let statusId = input.statusId;
    if (!statusId) {
      const defaultStatus = await prisma.projectStatusConfig.findFirst({
        where: { projectId, category: 'backlog' },
        orderBy: { position: 'asc' },
      });
      statusId = defaultStatus?.id;
    }

    const issue = await prisma.issue.create({
      data: {
        orgId,
        projectId,
        issueKey,
        title: input.title,
        description: input.description,
        type: input.type ?? 'task',
        statusId,
        priority: input.priority ?? 'medium',
        assigneeId: input.assigneeId,
        reporterId: ctx.userId,
        parentId: input.parentId,
        sprintId: input.sprintId,
        milestoneId: input.milestoneId,
        epicId: input.epicId,
        estimate: input.estimate,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        rank: (maxRank._max.rank ?? 0) + 1000,
      },
      include: issueInclude,
    });

    // Fan out to background jobs
    await Promise.all([
      notificationQueue.add('issue-created', { correlationId: ctx.correlationId, issueId: issue.id, orgId, actorId: ctx.userId }),
      searchIndexQueue.add('index', { correlationId: ctx.correlationId, type: 'issue', id: issue.id, orgId }),
      auditQueue.add('log', {
        correlationId: ctx.correlationId,
        action: 'issue.created',
        actorId: ctx.userId,
        actorRole: ctx.role,
        orgId,
        resourceType: 'issue',
        resourceId: issue.id,
      }),
    ]);

    return issue;
  },

  async getById(issueId: string, orgId: string) {
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, orgId, deletedAt: null },
      include: {
        ...issueInclude,
        subtasks: { include: { status: true, assignee: { select: { id: true, fullName: true, avatarUrl: true } } } },
        attachments: { include: { uploader: { select: { id: true, fullName: true } } } },
        blockedBy: { include: { blocker: { select: { id: true, issueKey: true, title: true, status: true } } } },
        blocks: { include: { blocked: { select: { id: true, issueKey: true, title: true, status: true } } } },
        timeLogs: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!issue) throw Object.assign(new Error('Issue not found'), { statusCode: 404 });
    return issue;
  },

  async update(issueId: string, orgId: string, input: UpdateIssueInput, ctx: RequestContext) {
    const issue = await prisma.issue.findFirst({ where: { id: issueId, orgId, deletedAt: null } });
    if (!issue) throw Object.assign(new Error('Issue not found'), { statusCode: 404 });

    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    const isOwn = issue.reporterId === ctx.userId || issue.assigneeId === ctx.userId;
    const canEditAny = can(userCtx, 'edit:any_issue');
    const canEditOwn = can(userCtx, 'edit:own_issue');

    if (!canEditAny && !(canEditOwn && isOwn)) throw new PermissionError('Insufficient permissions');

    const before = { ...issue };

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: {
        ...input,
        dueDate: input.dueDate ? new Date(input.dueDate) : input.dueDate === null ? null : undefined,
      },
      include: issueInclude,
    });

    await Promise.all([
      notificationQueue.add('issue-updated', {
        correlationId: ctx.correlationId,
        issueId,
        orgId,
        actorId: ctx.userId,
        changes: input,
      }),
      searchIndexQueue.add('index', { correlationId: ctx.correlationId, type: 'issue', id: issueId, orgId }),
      auditQueue.add('log', {
        correlationId: ctx.correlationId,
        action: 'issue.updated',
        actorId: ctx.userId,
        orgId,
        resourceType: 'issue',
        resourceId: issueId,
        metadata: { before, after: input },
      }),
    ]);

    return updated;
  },

  async delete(issueId: string, orgId: string, ctx: RequestContext) {
    const issue = await prisma.issue.findFirst({ where: { id: issueId, orgId, deletedAt: null } });
    if (!issue) throw Object.assign(new Error('Issue not found'), { statusCode: 404 });

    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    const isOwn = issue.reporterId === ctx.userId;
    const canDeleteAny = can(userCtx, 'delete:any_issue');
    const canDeleteOwn = can(userCtx, 'delete:own_issue');

    if (!canDeleteAny && !(canDeleteOwn && isOwn)) throw new PermissionError('Insufficient permissions');

    await prisma.issue.update({ where: { id: issueId }, data: { deletedAt: new Date() } });

    await auditQueue.add('log', {
      correlationId: ctx.correlationId,
      action: 'issue.deleted',
      actorId: ctx.userId,
      orgId,
      resourceType: 'issue',
      resourceId: issueId,
    });

    return { success: true };
  },

  async updateRank(issueId: string, orgId: string, input: UpdateIssueRankInput, ctx: RequestContext) {
    await prisma.issue.update({
      where: { id: issueId },
      data: {
        rank: input.rank,
        statusId: input.statusId,
        sprintId: input.sprintId !== undefined ? input.sprintId : undefined,
      },
    });
    return { success: true };
  },

  async listComments(issueId: string, orgId: string) {
    return prisma.comment.findMany({
      where: { issueId, orgId, deletedAt: null, parentId: null },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
        replies: {
          where: { deletedAt: null },
          include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async createComment(issueId: string, orgId: string, input: CreateCommentInput, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'comment:issue')) throw new PermissionError('Insufficient permissions');

    const comment = await prisma.comment.create({
      data: {
        issueId,
        orgId,
        authorId: ctx.userId,
        body: input.body,
        parentId: input.parentId,
      },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    await notificationQueue.add('issue-commented', {
      correlationId: ctx.correlationId,
      issueId,
      orgId,
      actorId: ctx.userId,
      commentId: comment.id,
    });

    return comment;
  },

  async bulkUpdate(orgId: string, input: BulkUpdateIssuesInput, ctx: RequestContext) {
    const userCtx = { tenantRole: ctx.role as any, platformRole: ctx.platformRole as any };
    if (!can(userCtx, 'edit:any_issue')) throw new PermissionError('Insufficient permissions');

    const data: Record<string, unknown> = {};
    if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId;
    if (input.statusId) data.statusId = input.statusId;
    if (input.priority) data.priority = input.priority;
    if (input.sprintId !== undefined) data.sprintId = input.sprintId;

    await prisma.issue.updateMany({
      where: { id: { in: input.issueIds }, orgId },
      data,
    });

    return { updated: input.issueIds.length };
  },
};

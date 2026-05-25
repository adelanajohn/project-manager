import type { FastifyInstance } from 'fastify';
import { prisma } from '@pm/db';

export default async function orgDashboardRoutes(app: FastifyInstance) {
  /**
   * GET /orgs/:orgId/dashboard
   * Returns KPI metrics for the org-level dashboard.
   */
  app.get('/orgs/:orgId/dashboard', {
    preHandler: [app.authenticate],
    schema: {
      tags: ['Organizations'],
      summary: 'Get org dashboard KPIs',
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      openIssues,
      openIssuesLastWeek,
      activeSprints,
      overdueIssues,
      memberCount,
      recentActivity,
      throughputRaw,
    ] = await Promise.all([
      // Current open issues
      prisma.issue.count({
        where: {
          orgId,
          deletedAt: null,
          status: { category: { notIn: ['done', 'canceled'] } },
        },
      }),

      // Open issues a week ago (for trend)
      prisma.issue.count({
        where: {
          orgId,
          deletedAt: null,
          createdAt: { lt: oneWeekAgo },
          status: { category: { notIn: ['done', 'canceled'] } },
        },
      }),

      // Active sprints
      prisma.sprint.findMany({
        where: { orgId, status: 'active' },
        include: {
          issues: {
            where: { deletedAt: null },
            select: { id: true, estimate: true, status: { select: { category: true } } },
          },
          project: { select: { name: true, identifier: true, color: true } },
        },
      }),

      // Overdue issues (past due date, not done)
      prisma.issue.count({
        where: {
          orgId,
          deletedAt: null,
          dueDate: { lt: new Date() },
          status: { category: { notIn: ['done', 'canceled'] } },
        },
      }),

      // Member count
      prisma.orgMember.count({ where: { orgId } }),

      // Recent audit log activity (last 20 events)
      prisma.auditLog.findMany({
        where: { orgId },
        include: {
          actor: { select: { id: true, fullName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Throughput: issues completed per day (last 30 days)
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT
          DATE_TRUNC('day', i.updated_at) AS day,
          COUNT(*) AS count
        FROM issues i
        JOIN project_statuses ps ON ps.id = i.status_id
        WHERE i.org_id = ${orgId}
          AND i.deleted_at IS NULL
          AND ps.category = 'done'
          AND i.updated_at > NOW() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `,
    ]);

    // Build sprint progress widgets
    const sprintProgress = activeSprints.map((sprint) => {
      const total = sprint.issues.length;
      const done = sprint.issues.filter((i) => i.status?.category === 'done').length;
      const totalPts = sprint.issues.reduce((s, i) => s + (i.estimate ?? 0), 0);
      const donePts = sprint.issues
        .filter((i) => i.status?.category === 'done')
        .reduce((s, i) => s + (i.estimate ?? 0), 0);

      return {
        id: sprint.id,
        name: sprint.name,
        project: sprint.project,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        total,
        done,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
        totalPts,
        donePts,
      };
    });

    // Normalise throughput to a daily array for the chart
    const throughput = throughputRaw.map((r) => ({
      day: r.day.toISOString().split('T')[0],
      count: Number(r.count),
    }));

    // Compute open issue trend
    const openIssueTrend = openIssues - openIssuesLastWeek;

    reply.send({
      data: {
        kpis: {
          openIssues,
          openIssueTrend,
          activeSprints: activeSprints.length,
          overdueIssues,
          memberCount,
        },
        sprintProgress,
        throughput,
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          action: a.action,
          actor: a.actor,
          resourceType: a.resourceType,
          resourceId: a.resourceId,
          createdAt: a.createdAt,
        })),
      },
      meta: { requestId: request.correlationId, timestamp: new Date().toISOString() },
      error: null,
    });
  });
}

import type { PrismaClient } from '@prisma/client';

export interface RlsContext {
  orgId: string;
  userId: string;
  role: string;
}

/**
 * Returns a Prisma client extended with RLS session variable injection.
 * Call this at the start of each request with the JWT context.
 *
 * Usage:
 *   const db = withRls(prisma, { orgId, userId, role });
 *   await db.issue.findMany({ where: { projectId } });
 */
export function withRls(prisma: PrismaClient, ctx: RlsContext): PrismaClient {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            prisma.$executeRawUnsafe(
              `SELECT set_config('app.current_org_id', $1, true),
                      set_config('app.current_user_id', $2, true),
                      set_config('app.current_role', $3, true)`,
              ctx.orgId,
              ctx.userId,
              ctx.role
            ),
            query(args) as any,
          ]);
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}

import type { OrgPlan } from './types/enums';

export interface PlanLimits {
  members: number;
  projects: number;
  storageBytes: number;
  automationRules: number;
  apiCallsPerMonth: number;
  auditLogRetentionDays: number;
}

export const PLAN_LIMITS: Record<OrgPlan, PlanLimits> = {
  free: {
    members: 5,
    projects: 3,
    storageBytes: 1_073_741_824, // 1 GB
    automationRules: 10,
    apiCallsPerMonth: 10_000,
    auditLogRetentionDays: 30,
  },
  pro: {
    members: Infinity,
    projects: Infinity,
    storageBytes: 53_687_091_200, // 50 GB
    automationRules: Infinity,
    apiCallsPerMonth: 500_000,
    auditLogRetentionDays: 365,
  },
  enterprise: {
    members: Infinity,
    projects: Infinity,
    storageBytes: Infinity,
    automationRules: Infinity,
    apiCallsPerMonth: Infinity,
    auditLogRetentionDays: Infinity,
  },
};

export type PlanLimitKey = keyof PlanLimits;

export function getLimit(plan: OrgPlan, key: PlanLimitKey): number {
  return PLAN_LIMITS[plan][key];
}

export function isWithinLimit(plan: OrgPlan, key: PlanLimitKey, current: number): boolean {
  const limit = getLimit(plan, key);
  return limit === Infinity || current < limit;
}

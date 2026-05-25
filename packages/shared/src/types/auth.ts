import type { PlatformRole, TenantRole } from './enums';

export interface JwtPayload {
  sub: string;       // userId
  orgId: string;
  role: TenantRole | null;
  platformRole: PlatformRole | null;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RequestContext {
  correlationId: string;
  userId: string;
  orgId: string;
  role: TenantRole | null;
  platformRole: PlatformRole | null;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

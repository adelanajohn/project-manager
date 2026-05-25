export interface ApiResponse<T = unknown> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    requestId: string;
    timestamp: string;
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
  error: null;
}

export interface CursorPagination {
  cursor?: string;
  limit?: number;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PLAN_LIMIT_REACHED'
  | 'INTERNAL_ERROR';

export interface ZzjlApiResponse<T = unknown> {
  resultCode: string;
  resultMsg: string;
  resultObject: T | null;
  stack: string;
  errorInfos: unknown[] | null;
  guidance: unknown | null;
}

export interface PageInfo<T> {
  total: string;
  list: T[];
  pageNum: number;
  pageSize: number;
  size: number;
  pages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type ErrorCode =
  | 'CONFIG_MISSING'
  | 'AUTH_FAILED'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'PROCESSING'
  | 'TIMEOUT'
  | 'INVALID_INPUT'
  | 'UPSTREAM_ERROR'
  | 'RATE_LIMITED';

export interface ToolSuccess<T> {
  success: true;
  data: T;
  metadata?: {
    total?: number;
    page?: number;
    has_more?: boolean;
    truncated?: boolean;
    search_mode?: 'lexical';
  };
}

export interface ToolError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    suggested_action?: string;
  };
}

export type ToolResult<T> = ToolSuccess<T> | ToolError;

export function toolSuccess<T>(
  data: T,
  metadata?: ToolSuccess<T>['metadata'],
): ToolSuccess<T> {
  return { success: true, data, ...(metadata ? { metadata } : {}) };
}

export function toolError(
  code: ErrorCode,
  message: string,
  retryable: boolean,
  suggested_action?: string,
): ToolError {
  return {
    success: false,
    error: { code, message, retryable, ...(suggested_action ? { suggested_action } : {}) },
  };
}

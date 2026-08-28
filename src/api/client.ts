import type { EnvConfig } from '../config/env.js';
import { API_REGISTRY, type ApiRegistryEntry } from './registry.js';
import type { ZzjlApiResponse, ErrorCode } from './types.js';

const RATE_LIMIT_RPS = 2;
const RATE_LIMIT_INTERVAL_MS = 1000 / RATE_LIMIT_RPS;

export class ZzjlApiClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private lastRequestTime = 0;
  private requestQueue: Array<() => void> = [];
  private processing = false;

  constructor(private config: EnvConfig) {
    this.baseUrl = config.ZZJL_API_BASE_URL;
    this.apiKey = config.ZZJL_API_KEY;
    this.timeout = config.ZZJL_REQUEST_TIMEOUT_MS;
  }

  private async acquireSlot(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_INTERVAL_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  async call<T = unknown>(
    registryKey: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const entry = API_REGISTRY[registryKey];
    if (!entry) {
      throw new ApiError('INVALID_INPUT', `未知接口: ${registryKey}`, false);
    }

    await this.acquireSlot();

    const url = this.buildUrl(entry, params);
    const init = this.buildRequest(entry, params);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        throw new ApiError(
          'AUTH_FAILED',
          'API Key 无效或已过期，请检查 ZZJL_API_KEY 配置',
          false,
        );
      }
      if (response.status === 404) {
        throw new ApiError(
          'NOT_FOUND',
          `接口 ${registryKey} 当前不可用（HTTP 404）`,
          false,
        );
      }
      if (response.status === 429) {
        throw new ApiError('RATE_LIMITED', '请求频率过高，请稍后重试', true);
      }
      if (response.status >= 500) {
        throw new ApiError('UPSTREAM_ERROR', `上游服务错误 (HTTP ${response.status})`, true);
      }

      const body = (await response.json()) as ZzjlApiResponse<T>;
      return this.parseResponse(body, registryKey);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ApiError) throw err;

      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('TIMEOUT', `请求超时 (${this.timeout}ms)`, true);
      }

      throw new ApiError(
        'UPSTREAM_ERROR',
        `网络请求失败: ${err instanceof Error ? err.message : String(err)}`,
        true,
      );
    }
  }

  async callFireAndForget(
    registryKey: string,
    params: Record<string, unknown> = {},
  ): Promise<void> {
    const entry = API_REGISTRY[registryKey];
    if (!entry) {
      throw new ApiError('INVALID_INPUT', `未知接口: ${registryKey}`, false);
    }

    await this.acquireSlot();

    const url = this.buildUrl(entry, params);
    const init = this.buildRequest(entry, params);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        throw new ApiError('AUTH_FAILED', 'API Key 无效或已过期', false);
      }
      if (response.status >= 400) {
        throw new ApiError('UPSTREAM_ERROR', `${registryKey} 触发失败 (HTTP ${response.status})`, false);
      }
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ApiError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('TIMEOUT', `请求超时 (${this.timeout}ms)`, true);
      }
      throw new ApiError('UPSTREAM_ERROR', `网络请求失败: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  }

  private buildUrl(entry: ApiRegistryEntry, params: Record<string, unknown>): string {
    const url = new URL(entry.path, this.baseUrl);
    if (entry.paramMode === 'query') {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }
    return url.toString();
  }

  private buildRequest(
    entry: ApiRegistryEntry,
    params: Record<string, unknown>,
  ): RequestInit {
    const headers: Record<string, string> = {
      Authorization: this.apiKey,
    };
    if (entry.contentType) {
      headers['Content-Type'] = entry.contentType;
    }

    const init: RequestInit = {
      method: entry.method,
      headers,
    };

    if (entry.paramMode === 'body' && entry.method === 'POST') {
      init.body = JSON.stringify(params);
    }

    return init;
  }

  private parseResponse<T>(body: ZzjlApiResponse<T>, registryKey: string): T {
    if (body.resultCode === '0') {
      return body.resultObject as T;
    }

    if (body.resultCode === '401') {
      throw new ApiError('AUTH_FAILED', '认证失败，请检查 API Key', false);
    }

    const msg = body.resultMsg || '未知错误';
    if (msg.includes('不存在') || msg.includes('not found')) {
      throw new ApiError('NOT_FOUND', msg, false);
    }

    throw new ApiError(
      'UPSTREAM_ERROR',
      `${registryKey} 调用失败: [${body.resultCode}] ${msg}`,
      false,
    );
  }
}

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public retryable: boolean,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

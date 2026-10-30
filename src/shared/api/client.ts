import { APP_CONFIG } from '../config/constants';
import type { ApiErrorResponse } from './types';

export class ApiError extends Error {
  status: number;
  code: string;
  errors?: Record<string, string>;
  available?: number;
  retryAfterSeconds?: number;
  items?: ApiErrorResponse['items'];

  constructor(status: number, data: Partial<ApiErrorResponse>) {
    super(data.message || 'API Request Failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = data.code || 'UNKNOWN_ERROR';
    this.errors = data.errors;
    this.available = data.available;
    this.retryAfterSeconds = data.retryAfterSeconds;
    this.items = data.items;
  }
}

type UnauthorizedHandler = (reason: string) => void;
let onUnauthorizedCallback: UnauthorizedHandler | null = null;

export function setOnUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorizedCallback = handler;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(APP_CONFIG.TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(APP_CONFIG.TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(APP_CONFIG.TOKEN_STORAGE_KEY);
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuthRedirect?: boolean;
}

/**
 * Central API client function (FE-002 Architecture recommendation):
 * Attaches Bearer token, parses JSON/204, handles 401 TOKEN_EXPIRED centrally.
 * Note: 400 INVALID_CURRENT_PASSWORD does NOT trigger logout!
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers: customHeaders, skipAuthRedirect = false, ...restOptions } = options;

  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${APP_CONFIG.API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Network error occurred',
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let data: Partial<ApiErrorResponse> & Record<string, unknown> = {};
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const error = new ApiError(response.status, data);

    // Central 401 handling (FE-002):
    // Ignore 401 on /auth/login (INVALID_CREDENTIALS) or when skipAuthRedirect is set.
    if (
      response.status === 401 &&
      error.code !== 'INVALID_CREDENTIALS' &&
      !skipAuthRedirect
    ) {
      clearAccessToken();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback(error.code);
      }
    }

    throw error;
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

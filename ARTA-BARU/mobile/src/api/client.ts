/**
 * HTTP client for the ARTA Laravel API (mobile).
 *
 * Contract: `{EXPO_PUBLIC_API_URL}/api/v1/...` (PRD section 47, backend
 * `routes/api.php`, `backend/docs/api-contract.md`). Every request resolves
 * its URL from the existing environment config (`src/config/env.ts`); no
 * production URL or secret is embedded in code.
 *
 * Safety rules (AGENTS.md financial integrity + roadmap task scope):
 * - Exactly one attempt per call. No automatic retry of any request,
 *   especially non-idempotent POST/PATCH/DELETE. Retries are only ever
 *   user-initiated (UI retry button) or an explicit new call.
 * - JSON only. A success response without a parseable JSON body is an
 *   `invalid_response` error, never silently accepted.
 * - Nothing is logged here: no URL query contents, no headers, no bodies,
 *   no tokens. Callers must not log secrets either.
 * - Timeouts use AbortController (default 15s) and surface as `timeout`,
 *   distinct from `network` (unreachable/offline) failures.
 */

import { env } from '../config/env';

export const DEFAULT_TIMEOUT_MS = 15000;

export type ApiErrorKind =
  | 'missing_api_url'
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'invalid_response'
  | 'http';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly fields?: Record<string, string[]>;

  constructor(
    kind: ApiErrorKind,
    message: string,
    status?: number,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.fields = fields;
  }
}

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  method: ApiMethod;
  /** Path relative to `/api/v1`, e.g. `/auth/login`. */
  path: string;
  body?: Record<string, unknown>;
  token?: string;
  timeoutMs?: number;
}

export type FetchImpl = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal | null;
  },
) => Promise<Response>;

export type RequestFn = <T>(options: ApiRequestOptions) => Promise<T>;

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

function fieldErrors(value: unknown): Record<string, string[]> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  const out: Record<string, string[]> = {};
  for (const [field, messages] of entries) {
    if (
      Array.isArray(messages) &&
      messages.every((message) => typeof message === 'string')
    ) {
      out[field] = messages as string[];
    } else {
      return undefined;
    }
  }
  return out;
}

function errorMessage(payload: unknown, fallback: string): string {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as { message?: unknown }).message === 'string'
  ) {
    return (payload as { message: string }).message;
  }
  return fallback;
}

function mapStatusError(status: number, payload: unknown): ApiError {
  switch (status) {
    case 401:
      return new ApiError(
        'unauthorized',
        errorMessage(payload, 'Unauthenticated.'),
        status,
      );
    case 403:
      return new ApiError(
        'forbidden',
        errorMessage(payload, 'Forbidden.'),
        status,
      );
    case 404:
      return new ApiError(
        'not_found',
        errorMessage(payload, 'Not found.'),
        status,
      );
    case 422: {
      const fields = fieldErrors(
        (payload as { errors?: unknown } | null)?.errors,
      );
      return new ApiError(
        'validation',
        errorMessage(payload, 'Validation failed.'),
        status,
        fields,
      );
    }
    case 429:
      return new ApiError(
        'rate_limited',
        errorMessage(payload, 'Too many requests.'),
        status,
      );
    default:
      if (status >= 500) {
        return new ApiError(
          'server',
          errorMessage(payload, 'Server error.'),
          status,
        );
      }
      return new ApiError(
        'http',
        errorMessage(payload, `Request failed (${status}).`),
        status,
      );
  }
}

export function createApiClient(apiUrl: string, fetchImpl: FetchImpl = fetch) {
  async function request<T>(options: ApiRequestOptions): Promise<T> {
    if (!apiUrl) {
      throw new ApiError(
        'missing_api_url',
        'API URL is not configured (EXPO_PUBLIC_API_URL).',
      );
    }

    const base = apiUrl.replace(/\/+$/, '');
    const path = options.path.startsWith('/')
      ? options.path
      : `/${options.path}`;
    const url = `${base}/api/v1${path}`;

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: options.method,
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new ApiError('timeout', 'Request timed out.');
      }
      throw new ApiError('network', 'Network request failed.');
    } finally {
      clearTimeout(timer);
    }

    let text: string;
    try {
      text = await response.text();
    } catch {
      throw new ApiError(
        'invalid_response',
        'Could not read server response.',
        response.status,
      );
    }

    let payload: unknown;
    try {
      payload = text === '' ? undefined : JSON.parse(text);
    } catch {
      throw new ApiError(
        'invalid_response',
        'Server returned a non-JSON response.',
        response.status,
      );
    }

    if (!response.ok) {
      throw mapStatusError(response.status, payload);
    }

    if (payload === undefined) {
      throw new ApiError(
        'invalid_response',
        'Server returned an empty success response.',
        response.status,
      );
    }

    return payload as T;
  }

  return { request: request as RequestFn, apiUrl };
}

/** Default client wired to the environment config. Tests use `createApiClient`. */
export const api = createApiClient(env.apiUrl);

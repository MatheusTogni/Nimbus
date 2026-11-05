/**
 * Minimal fetch client:
 * - keeps the access token in memory only (never in localStorage);
 * - the refresh token lives in an httpOnly cookie handled by the browser;
 * - on 401 it refreshes once and retries; concurrent refreshes share a single request,
 *   and tabs are serialized with the Web Locks API so they never race on cookie rotation.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: object
  /** Return the raw Response (e.g. for file downloads). */
  raw?: boolean
  /** Do not try to refresh the session on 401. */
  skipRefresh?: boolean
}

const BASE = '/api'
let accessToken: string | null = null
let refreshing: Promise<string | null> | null = null
let onSessionExpired: (() => void) | null = null
let refreshHandler: (() => Promise<string | null>) | null = null

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token
  },
}

/** Called when the session cannot be refreshed anymore (redirects to login). */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

/** Performs the refresh call and returns the new access token (or null). */
export function setRefreshHandler(handler: () => Promise<string | null>) {
  refreshHandler = handler
}

export function refreshSession(): Promise<string | null> {
  if (!refreshHandler) return Promise.resolve(null)
  if (!refreshing) {
    const run = refreshHandler
    const locked =
      typeof navigator !== 'undefined' && 'locks' in navigator
        ? navigator.locks.request('nimbus-refresh', () => run())
        : run()
    refreshing = locked.finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

export function buildQuery(query?: object): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options)

  if (response.status === 401 && !options.skipRefresh) {
    const token = await refreshSession()
    if (token) return request<T>(path, { ...options, skipRefresh: true })
    onSessionExpired?.()
  }

  if (!response.ok) throw await toError(response)
  if (options.raw) return response as T
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return fetch(`${BASE}${path}${buildQuery(options.query)}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
  })
}

async function toError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { code?: string; message?: string; details?: unknown }
    return new ApiError(
      response.status,
      body.code ?? 'INTERNAL_ERROR',
      body.message ?? response.statusText,
      body.details,
    )
  } catch {
    return new ApiError(response.status, response.status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN', response.statusText)
  }
}

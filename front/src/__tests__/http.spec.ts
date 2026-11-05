import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  buildQuery,
  request,
  setRefreshHandler,
  setSessionExpiredHandler,
  tokenStore,
} from '@/api/http'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('http client', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    tokenStore.set('old-token')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('builds query strings without empty values', () => {
    expect(buildQuery({ a: 1, b: '', c: undefined, d: 'x y' })).toBe('?a=1&d=x+y')
    expect(buildQuery({})).toBe('')
  })

  it('sends the bearer token and parses JSON', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }))
    await expect(request('/ping')).resolves.toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/ping')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer old-token')
  })

  it('refreshes once on 401 and retries with the new token', async () => {
    const refresh = vi.fn(async () => {
      tokenStore.set('new-token')
      return 'new-token'
    })
    setRefreshHandler(refresh)
    fetchMock
      .mockResolvedValueOnce(json(401, { code: 'UNAUTHORIZED', message: 'expired' }))
      .mockResolvedValueOnce(json(200, { data: 1 }))

    await expect(request('/risks')).resolves.toEqual({ data: 1 })
    expect(refresh).toHaveBeenCalledTimes(1)
    const retryHeaders = fetchMock.mock.calls[1]![1]!.headers as Record<string, string>
    expect(retryHeaders.Authorization).toBe('Bearer new-token')
  })

  it('shares a single refresh between concurrent requests', async () => {
    let resolveRefresh: (token: string) => void = () => {}
    const refresh = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveRefresh = (token) => {
            tokenStore.set(token)
            resolve(token)
          }
        }),
    )
    setRefreshHandler(refresh)
    fetchMock.mockImplementation(async (_url, init) => {
      const auth = (init!.headers as Record<string, string>).Authorization
      return auth === 'Bearer fresh' ? json(200, { ok: true }) : json(401, { code: 'UNAUTHORIZED' })
    })

    const pending = Promise.all([request('/a'), request('/b'), request('/c')])
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled())
    resolveRefresh('fresh')
    await expect(pending).resolves.toHaveLength(3)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('calls the session-expired handler when refresh fails', async () => {
    setRefreshHandler(async () => null)
    const expired = vi.fn()
    setSessionExpiredHandler(expired)
    fetchMock.mockResolvedValue(json(401, { code: 'UNAUTHORIZED', message: 'nope' }))

    await expect(request('/risks')).rejects.toBeInstanceOf(ApiError)
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it('maps API errors to ApiError with the server code', async () => {
    fetchMock.mockResolvedValueOnce(json(403, { code: 'DEMO_RESTRICTED', message: 'demo' }))
    const error = await request('/users', { method: 'POST', body: {} }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('DEMO_RESTRICTED')
    expect((error as ApiError).status).toBe(403)
  })
})

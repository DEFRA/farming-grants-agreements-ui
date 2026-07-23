import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { apiRequest } from './api.js'

vi.mock('./jwt-auth.js', () => ({
  extractJwtPayload: vi.fn(),
  validateJwtAuthentication: vi.fn()
}))

const originalFetch = globalThis.fetch

const createErrorResponse = (overrides = {}) => ({
  ok: false,
  status: 500,
  statusText: 'Internal Server Error',
  text: vi.fn().mockResolvedValue('{}'),
  json: vi.fn(),
  ...overrides
})

describe('apiRequest error handling', () => {
  const baseRequest = {
    agreementId: 'FPTT123',
    auth: 'mock-auth-token'
  }

  beforeEach(async () => {
    globalThis.fetch = vi.fn()
    const { extractJwtPayload } = await import('./jwt-auth.js')
    extractJwtPayload.mockReturnValue({ grantCode: 'MOCK' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  test('appends truncated backend error message when errorMessage is provided (GET request)', async () => {
    const backendResponse = createErrorResponse({
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          errorMessage: 'Backend failure {Stack trace details}'
        })
      )
    })

    globalThis.fetch.mockResolvedValue(backendResponse)

    const error = await apiRequest({
      ...baseRequest,
      jwtPayload: { grantCode: 'MOCK' },
      backend: 'legacy'
    }).catch((err) => err)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Unable to load agreement. Backend failure')
    expect(error.cause).toBe(backendResponse)
    expect(backendResponse.text).toHaveBeenCalled()
  })

  test('appends truncated backend error message when errorMessage is provided (POST request)', async () => {
    const backendResponse = createErrorResponse({
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          errorMessage: 'Validation failed {Stack trace details}'
        })
      )
    })

    globalThis.fetch.mockResolvedValue(backendResponse)

    const error = await apiRequest({
      ...baseRequest,
      method: 'POST',
      body: {},
      jwtPayload: { grantCode: 'MOCK' },
      backend: 'legacy'
    }).catch((err) => err)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Unable to update agreement. Validation failed')
    expect(error.cause).toBe(backendResponse)
    expect(backendResponse.text).toHaveBeenCalled()
  })

  test('falls back to HTTP status text when errorMessage is not a string (GET request)', async () => {
    const backendResponse = createErrorResponse({
      status: 400,
      statusText: 'Bad request from land grants',
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          errorMessage: { detail: 'not a string' }
        })
      )
    })

    globalThis.fetch.mockResolvedValue(backendResponse)

    const error = await apiRequest({
      ...baseRequest,
      jwtPayload: { grantCode: 'MOCK' },
      backend: 'legacy'
    }).catch((err) => err)

    expect(error.message).toBe(
      'Unable to load agreement. 400 Bad request from land grants'
    )
  })

  test('falls back to HTTP status text when response is not valid JSON (GET request)', async () => {
    const backendResponse = createErrorResponse({
      status: 502,
      statusText: 'Bad Gateway',
      text: vi.fn().mockResolvedValue('not-json')
    })

    globalThis.fetch.mockResolvedValue(backendResponse)

    const error = await apiRequest({
      ...baseRequest,
      jwtPayload: { grantCode: 'MOCK' },
      backend: 'legacy'
    }).catch((err) => err)

    expect(error.message).toBe('Unable to load agreement. 502 Bad Gateway')
  })

  test('re-throws error when fetch fails (e.g., network error)', async () => {
    const networkError = new Error('Network failure')
    globalThis.fetch.mockRejectedValue(networkError)

    const error = await apiRequest({
      ...baseRequest,
      jwtPayload: { grantCode: 'MOCK' },
      backend: 'legacy'
    }).catch((err) => err)

    expect(error).toBe(networkError)
  })

  test('constructs gas backend URL correctly for GET', async () => {
    const jwtPayload = {
      grantCode: 'GAS001',
      clientRef: 'REF123',
      sbi: '123456789'
    }

    const mockConfig = (await import('#~/config/config.js')).config
    const originalGet = mockConfig.get
    mockConfig.get = vi.fn((key) => {
      if (key === 'gasBackend.allowedGrantCodes') return ['GAS001']
      if (key === 'gasBackend.url') return 'http://gas-api'
      if (key === 'gasBackend.authToken') return 'gas-token'
      return originalGet.call(mockConfig, key)
    })

    const backendResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ data: 'gas-data' })
    }
    globalThis.fetch.mockResolvedValue(backendResponse)

    const result = await apiRequest({
      ...baseRequest,
      queryParams: { existing: 'param' },
      jwtPayload,
      backend: 'gas'
    })

    expect(result).toEqual({ data: 'gas-data', source: 'gas' })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('http://gas-api/agreements/current?'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gas-token'
        })
      })
    )

    const fetchArgs = globalThis.fetch.mock.calls[0][1]
    expect(fetchArgs.headers).not.toHaveProperty('x-encrypted-auth')
    expect(fetchArgs.headers).toHaveProperty(
      'Authorization',
      'Bearer gas-token'
    )

    const url = globalThis.fetch.mock.calls[0][0]
    const searchParams = new URLSearchParams(url.split('?')[1])
    expect(searchParams.get('existing')).toBe('param')
    expect(searchParams.get('code')).toBe('GAS001')
    expect(searchParams.get('clientRef')).toBe('REF123')
    expect(searchParams.get('sbi')).toBe('123456789')

    mockConfig.get = originalGet
  })

  test('constructs gas backend URL correctly for POST', async () => {
    const jwtPayload = { grantCode: 'GAS001' }

    const mockConfig = (await import('#~/config/config.js')).config
    const originalGet = mockConfig.get
    mockConfig.get = vi.fn((key) => {
      if (key === 'gasBackend.allowedGrantCodes') return ['GAS001']
      if (key === 'gasBackend.url') return 'http://gas-api'
      if (key === 'gasBackend.authToken') return 'gas-token'
      return originalGet.call(mockConfig, key)
    })

    const backendResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ data: 'gas-post-data' })
    }
    globalThis.fetch.mockResolvedValue(backendResponse)

    const result = await apiRequest({
      ...baseRequest,
      method: 'POST',
      body: { action: 'test' },
      actionName: 'submit',
      jwtPayload,
      backend: 'gas'
    })

    expect(result).toEqual({ data: 'gas-post-data', source: 'gas' })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gas-token'
        })
      })
    )

    const fetchArgs = globalThis.fetch.mock.calls[0][1]
    expect(fetchArgs.headers).not.toHaveProperty('x-encrypted-auth')

    mockConfig.get = originalGet
  })

  test('constructs legacy backend URL correctly', async () => {
    const jwtPayload = { grantCode: 'LEGACY001' }

    const mockConfig = (await import('#~/config/config.js')).config
    const originalGet = mockConfig.get
    mockConfig.get = vi.fn((key) => {
      if (key === 'gasBackend.allowedGrantCodes') return ['GAS001']
      if (key === 'backend.url') return 'http://legacy-api'
      return originalGet.call(mockConfig, key)
    })

    const backendResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ data: 'legacy-data' })
    }
    globalThis.fetch.mockResolvedValue(backendResponse)

    const result = await apiRequest({
      ...baseRequest,
      jwtPayload,
      backend: 'legacy'
    })

    expect(result).toEqual({ data: 'legacy-data', source: 'legacy' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://legacy-api/FPTT123',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-encrypted-auth': 'mock-auth-token'
        })
      })
    )

    const fetchArgs = globalThis.fetch.mock.calls[0][1]
    expect(fetchArgs.headers).not.toHaveProperty('Authorization')

    mockConfig.get = originalGet
  })
})

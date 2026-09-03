import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { apiRequest, gasActionRequest, getBackend } from './api.js'

vi.mock('./jwt-auth.js', () => ({
  extractJwtPayload: vi.fn(),
  validateJwtAuthentication: vi.fn()
}))

const originalFetch = globalThis.fetch

describe('getBackend', () => {
  test.each([undefined, null, '', ' '])(
    'does not default to legacy when grantCode is %j',
    (grantCode) => {
      expect(() => getBackend({ grantCode })).toThrow(
        'Agreement grant code is missing'
      )
    }
  )

  test.each(['FPTT329955480', 'WMP123456789'])(
    'routes recognised legacy agreement %s without a grant code to legacy',
    (agreementId) => {
      expect(getBackend({}, agreementId)).toBe('legacy')
    }
  )

  test.each([
    'PMF123456789',
    'FPTT-invalid',
    'WMP123',
    'FPTT1234567890',
    'wmp123456789'
  ])(
    'rejects unrecognised agreement number %s without a grant code',
    (agreementId) => {
      expect(() => getBackend({}, agreementId)).toThrow(
        'Agreement grant code is missing'
      )
    }
  )
})

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
      agreementId: undefined,
      queryParams: { mode: 'print' },
      jwtPayload,
      backend: 'gas'
    })

    expect(result).toEqual({ data: 'gas-data', source: 'gas' })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('http://gas-api/agreements/current?'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gas-token',
          'x-agreement-code': 'GAS001',
          'x-agreement-client-ref': 'REF123',
          'x-agreement-sbi': '123456789'
        })
      })
    )

    const fetchArgs = globalThis.fetch.mock.calls[0][1]
    expect(fetchArgs.headers).toHaveProperty(
      'x-encrypted-auth',
      'mock-auth-token'
    )
    expect(fetchArgs.headers).toHaveProperty(
      'Authorization',
      'Bearer gas-token'
    )

    const url = globalThis.fetch.mock.calls[0][0]
    const searchParams = new URLSearchParams(url.split('?')[1])
    expect(searchParams.get('mode')).toBe('print')
    expect(searchParams.has('code')).toBe(false)
    expect(searchParams.has('clientRef')).toBe(false)
    expect(searchParams.has('sbi')).toBe(false)

    mockConfig.get = originalGet
  })

  test('constructs gas backend URL correctly for by-number GET', async () => {
    const jwtPayload = {
      source: 'defra',
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
      agreementId: 'GAS123',
      jwtPayload,
      backend: 'gas'
    })

    expect(result).toEqual({ data: 'gas-data', source: 'gas' })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://gas-api/agreements/GAS123/document',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gas-token',
          'x-agreement-source': 'defra',
          'x-agreement-code': 'GAS001',
          'x-agreement-sbi': '123456789'
        })
      })
    )

    const fetchArgs = globalThis.fetch.mock.calls[0][1]
    expect(fetchArgs.headers).not.toHaveProperty('x-agreement-client-ref')

    mockConfig.get = originalGet
  })

  test('constructs gas backend URL correctly for POST', async () => {
    const jwtPayload = {
      source: 'defra',
      grantCode: 'GAS001',
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
          Authorization: 'Bearer gas-token',
          'x-agreement-source': 'defra',
          'x-agreement-code': 'GAS001',
          'x-agreement-sbi': '123456789'
        })
      })
    )

    const fetchArgs = globalThis.fetch.mock.calls[0][1]
    expect(fetchArgs.headers).toHaveProperty(
      'x-encrypted-auth',
      'mock-auth-token'
    )

    mockConfig.get = originalGet
  })

  test('uses the configured timeout for GAS action requests', async () => {
    vi.useFakeTimers()
    globalThis.fetch.mockImplementationOnce(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason))
        })
    )

    const responsePromise = gasActionRequest({
      agreementId: 'GAS123',
      actionName: 'arbitrary-action',
      jwtPayload: { grantCode: 'GAS001' }
    })

    const rejection = expect(responsePromise).rejects.toThrow(
      'Network timed out while fetching data'
    )

    await vi.advanceTimersByTimeAsync(30000)
    await rejection
    vi.useRealTimers()
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

  test('clears timeout even if buildUrl fails', async () => {
    vi.spyOn(global, 'setTimeout')
    vi.spyOn(global, 'clearTimeout')

    // buildUrl will fail if backend is GAS and jwtPayload is missing
    const error = await apiRequest({
      ...baseRequest,
      backend: 'gas',
      jwtPayload: null
    }).catch((err) => err)

    expect(error).toBeDefined()
    expect(setTimeout).toHaveBeenCalled()
    expect(clearTimeout).toHaveBeenCalled()

    vi.restoreAllMocks()
  })
})

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
    agreementId: 'SFI123',
    auth: 'mock-auth-token'
  }

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  test('appends truncated backend error message when errorMessage is provided', async () => {
    const backendResponse = createErrorResponse({
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          errorMessage: 'Backend failure {Stack trace details}'
        })
      )
    })

    globalThis.fetch.mockResolvedValue(backendResponse)

    const error = await apiRequest(baseRequest).catch((err) => err)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Unable to load agreement. Backend failure')
    expect(error.cause).toBe(backendResponse)
    expect(backendResponse.text).toHaveBeenCalled()
  })

  test('falls back to HTTP status text when errorMessage is not a string', async () => {
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

    const error = await apiRequest(baseRequest).catch((err) => err)

    expect(error.message).toBe(
      'Unable to load agreement. 400 Bad request from land grants'
    )
  })

  test('falls back to HTTP status text when response is not valid JSON', async () => {
    const backendResponse = createErrorResponse({
      status: 502,
      statusText: 'Bad Gateway',
      text: vi.fn().mockResolvedValue('not-json')
    })

    globalThis.fetch.mockResolvedValue(backendResponse)

    const error = await apiRequest(baseRequest).catch((err) => err)

    expect(error.message).toBe('Unable to load agreement. 502 Bad Gateway')
  })
})

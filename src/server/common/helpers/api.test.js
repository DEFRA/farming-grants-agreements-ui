import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { config } from '#~/config/config.js'

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
    agreementId: 'FPTT123',
    auth: 'mock-auth-token'
  }
  const originalGasAuthToken = config.get('gasBackend.authToken')

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
    config.set('gasBackend.authToken', originalGasAuthToken)
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

    const error = await apiRequest(baseRequest).catch((err) => err)

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
      body: {}
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

    const error = await apiRequest(baseRequest).catch((err) => err)

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

    const error = await apiRequest(baseRequest).catch((err) => err)

    expect(error.message).toBe('Unable to load agreement. 502 Bad Gateway')
  })

  test('re-throws error when fetch fails (e.g., network error)', async () => {
    const networkError = new Error('Network failure')
    globalThis.fetch.mockRejectedValue(networkError)

    const error = await apiRequest(baseRequest).catch((err) => err)

    expect(error).toBe(networkError)
  })

  test('sends GAS bearer token only when proxying to GAS', async () => {
    config.set('gasBackend.authToken', 'gas-service-token')
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ agreement: {} })
    })

    await apiRequest({
      agreementId: 'PMF123',
      backend: 'gas',
      auth: 'encrypted-user-auth'
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/agreements/PMF123'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gas-service-token',
          'x-encrypted-auth': 'encrypted-user-auth'
        })
      })
    )
  })

  test('builds the GAS current agreement URL with source identity query parameters', async () => {
    config.set('gasBackend.url', 'http://gas:3102')
    config.set('gasBackend.authToken', 'gas-service-token')
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ source: 'config' })
    })

    await apiRequest({
      backend: 'gas',
      auth: 'encrypted-user-auth',
      currentAgreement: {
        code: 'pigs-might-fly',
        clientRef: '4c6-6tf-k8n',
        sbi: '106284736'
      }
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://gas:3102/agreements/current?code=pigs-might-fly&clientRef=4c6-6tf-k8n&sbi=106284736',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer gas-service-token',
          'x-encrypted-auth': 'encrypted-user-auth'
        })
      })
    )
  })

  test('does not send GAS bearer token to the legacy agreements API', async () => {
    config.set('gasBackend.authToken', 'gas-service-token')
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ agreementData: {} })
    })

    await apiRequest(baseRequest)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: 'Bearer gas-service-token'
        })
      })
    )
  })
})

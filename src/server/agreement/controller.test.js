import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

describe('#agreementController', () => {
  let server

  beforeAll(async () => {
    globalThis.fetch = vi.fn()
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 0 })
  })

  describe('success', () => {
    test('should call the backend API', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await server.inject({
        method: 'GET',
        url: '/',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3555/', {
        headers: {
          'x-encrypted-auth': 'mock-auth'
        },
        method: 'GET',
        signal: expect.any(AbortSignal)
      })
    })

    test('should call the backend API including SFI number', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await server.inject({
        method: 'GET',
        url: '/SFI123456789',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3555/SFI123456789', {
        headers: {
          'x-encrypted-auth': 'mock-auth'
        },
        method: 'GET',
        signal: expect.any(AbortSignal)
      })
    })
  })

  describe('failure', () => {
    test('should show "problem with the service" error page when the backend fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/SFI123456789',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3555/SFI123456789', {
        headers: {
          'x-encrypted-auth': 'mock-auth'
        },
        method: 'GET',
        signal: expect.any(AbortSignal)
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toContain('Sorry, there is a problem with the service')
      expect(result).toContain('Unable to load agreement')
    })

    test('should show "not authorised" error page when not authorised', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({})
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/SFI123456789',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3555/SFI123456789', {
        headers: {
          'x-encrypted-auth': 'mock-auth'
        },
        method: 'GET',
        signal: expect.any(AbortSignal)
      })

      expect(statusCode).toBe(statusCodes.unauthorized)
      expect(result).toContain(
        'Your account is not authorised to view/accept this offer agreement'
      )
    })

    test('should show "problem with the service" error page when fetch requests timeout', async () => {
      vi.useFakeTimers()
      let fetchCalledResolve
      const fetchCalledPromise = new Promise((resolve) => {
        fetchCalledResolve = resolve
      })

      fetch.mockImplementationOnce((url, { signal }) => {
        fetchCalledResolve()
        return new Promise((resolve, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(signal.reason)
            })
          }
        })
      })

      const responsePromise = server.inject({
        method: 'GET',
        url: '/',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      await fetchCalledPromise
      vi.advanceTimersByTime(30000)

      const { statusCode, result } = await responsePromise

      vi.useRealTimers()

      expect(fetch).toHaveBeenCalledWith('http://localhost:3555/', {
        headers: {
          'x-encrypted-auth': 'mock-auth'
        },
        method: 'GET',
        signal: expect.any(AbortSignal)
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toContain('Sorry, there is a problem with the service')
      expect(result).toContain('Network timed out while fetching data')
    })
  })
})

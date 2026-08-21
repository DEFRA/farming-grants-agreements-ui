import { agreementController } from './controller.js'
import {
  gasAgreementDocumentApiUrls,
  gasBackendUrl,
  gasGrantCode,
  gasPublicAgreementPaths,
  gasViewPageModel
} from '#~/server/agreement/__test__/gas-agreement.fixture.js'
import { createServer } from '#~/server/server.js'
import * as getControllerByActionModule from '#~/server/common/helpers/get-controller-by-action.js'
import { configDrivenAgreementController } from '#~/server/config-driven-agreement/controller.js'
import { statusCodes } from '#~/server/common/constants/status-codes.js'
import { config } from '#~/config/config.js'
import { extractJwtPayload } from '#~/server/common/helpers/jwt-auth.js'

vi.mock('#~/server/common/helpers/jwt-auth.js', () => ({
  extractJwtPayload: vi.fn()
}))

vi.mock('#~/server/config-driven-agreement/controller.js', () => ({
  configDrivenAgreementController: {
    handler: vi.fn()
  }
}))

describe('#agreementController', () => {
  let server

  beforeAll(async () => {
    config.set('backend.url', 'http://localhost:3555')
    config.set('gasBackend.url', gasBackendUrl)
    config.set('gasBackend.authToken', 'mock-gas-token')
    config.set('gasBackend.allowedGrantCodes', [gasGrantCode])
    globalThis.fetch = vi.fn()
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    extractJwtPayload.mockReturnValue({ grantCode: 'MOCK' })
  })

  describe('success', () => {
    test('should call the GAS backend when grantCode is "pigs-might-fly"', async () => {
      const mockPayload = {
        sub: '1234567890',
        name: 'John Doe',
        admin: true,
        iat: 1516239022,
        sbi: 106284736,
        source: 'defra',
        clientRef: 'client-ref-001',
        grantCode: gasGrantCode
      }
      extractJwtPayload.mockReturnValue(mockPayload)

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

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3102/agreements/current',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-gas-token',
            'x-agreement-code': gasGrantCode,
            'x-agreement-client-ref': 'client-ref-001',
            'x-agreement-sbi': '106284736'
          }),
          method: 'GET'
        })
      )

      const fetchArgs = fetch.mock.calls[0][1]
      expect(fetchArgs.headers).not.toHaveProperty('x-encrypted-auth')
    })

    test('should call the GAS backend by agreement number when grantCode is "pigs-might-fly" and agreementId is provided', async () => {
      const mockPayload = {
        sub: '1234567890',
        name: 'John Doe',
        admin: true,
        iat: 1516239022,
        sbi: 106284736,
        source: 'defra',
        clientRef: 'client-ref-001',
        grantCode: gasGrantCode
      }
      extractJwtPayload.mockReturnValue(mockPayload)

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await server.inject({
        method: 'GET',
        url: '/PMF001',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3102/agreements/PMF001/document',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-gas-token',
            'x-agreement-source': 'defra',
            'x-agreement-code': gasGrantCode,
            'x-agreement-sbi': '106284736'
          }),
          method: 'GET'
        })
      )

      const fetchHeaders = fetch.mock.calls[0][1].headers
      expect(fetchHeaders).not.toHaveProperty('x-agreement-client-ref')
    })

    test('routes a Caseworking agreement view to GAS by grant code and passes its complete page model to the renderer', async () => {
      extractJwtPayload.mockReturnValue({
        source: 'entra',
        grantCode: gasGrantCode,
        clientRef: 'case-reference',
        sbi: '300000000'
      })
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => gasViewPageModel
      })
      configDrivenAgreementController.handler.mockImplementation(
        (_request, h) => h.response('rendered by config-driven renderer')
      )

      const response = await server.inject({
        method: 'GET',
        url: `${gasPublicAgreementPaths.view}?view=latest&x-encrypted-auth=query-auth`,
        headers: {
          'x-encrypted-auth': 'caseworking-header-auth'
        }
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(extractJwtPayload).toHaveBeenCalledWith('caseworking-header-auth')
      expect(fetch).toHaveBeenCalledWith(gasAgreementDocumentApiUrls.view, {
        headers: {
          Authorization: 'Bearer mock-gas-token',
          'x-agreement-source': 'entra',
          'x-agreement-code': gasGrantCode,
          'x-agreement-sbi': '300000000'
        },
        method: 'GET',
        signal: expect.any(AbortSignal),
        redirect: 'manual'
      })
      expect(configDrivenAgreementController.handler).toHaveBeenCalledOnce()
      expect(configDrivenAgreementController.handler).toHaveBeenCalledWith(
        expect.objectContaining({
          pre: expect.objectContaining({
            data: { ...gasViewPageModel, source: 'gas' }
          })
        }),
        expect.anything()
      )
    })

    test('routes the public print path to the same GAS document', async () => {
      extractJwtPayload.mockReturnValue({
        source: 'defra',
        grantCode: gasGrantCode,
        clientRef: 'case-reference',
        sbi: '300000000'
      })
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => gasViewPageModel
      })
      configDrivenAgreementController.handler.mockImplementation(
        (_request, h) => h.response('rendered by config-driven renderer')
      )

      const response = await server.inject({
        method: 'GET',
        url: `${gasPublicAgreementPaths.print}?x-encrypted-auth=pdf-query-auth`
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(extractJwtPayload).toHaveBeenCalledWith('pdf-query-auth')
      expect(fetch).toHaveBeenCalledWith(gasAgreementDocumentApiUrls.print, {
        headers: {
          Authorization: 'Bearer mock-gas-token',
          'x-agreement-source': 'defra',
          'x-agreement-code': gasGrantCode,
          'x-agreement-sbi': '300000000'
        },
        method: 'GET',
        signal: expect.any(AbortSignal),
        redirect: 'manual'
      })
      expect(configDrivenAgreementController.handler).toHaveBeenCalledWith(
        expect.objectContaining({
          pre: expect.objectContaining({
            data: { ...gasViewPageModel, source: 'gas' }
          })
        }),
        expect.anything()
      )
    })

    test('rejects unsupported GAS agreement route suffixes', async () => {
      extractJwtPayload.mockReturnValue({
        source: 'entra',
        grantCode: gasGrantCode,
        clientRef: 'case-reference',
        sbi: '300000000'
      })
      const response = await server.inject({
        method: 'GET',
        url: `${gasPublicAgreementPaths.view}/preview?mode=print`,
        headers: { 'x-encrypted-auth': 'mock-auth' }
      })

      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(fetch).not.toHaveBeenCalled()
    })

    test('leaves legacy agreement route suffixes unchanged', async () => {
      extractJwtPayload.mockReturnValue({
        source: 'entra',
        grantCode: 'WMP'
      })
      fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      await server.inject({
        method: 'GET',
        url: '/WMP123456789/preview',
        headers: { 'x-encrypted-auth': 'mock-auth' }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3555/WMP123456789',
        expect.objectContaining({
          headers: { 'x-encrypted-auth': 'mock-auth' },
          method: 'GET'
        })
      )
    })

    test('should call the legacy backend when grantCode is "FPTT"', async () => {
      const mockPayload = {
        sub: '1234567890',
        name: 'John Doe',
        admin: true,
        iat: 1516239022,
        sbi: 106284736,
        source: 'defra',
        clientRef: 'client-ref-001',
        grantCode: 'FPTT'
      }
      extractJwtPayload.mockReturnValue(mockPayload)

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await server.inject({
        method: 'GET',
        url: '/FPTT123',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3555/FPTT123', {
        headers: {
          'x-encrypted-auth': 'mock-auth'
        },
        method: 'GET',
        signal: expect.any(AbortSignal)
      })
    })

    test('preserves WMP view and print routing through the legacy backend', async () => {
      extractJwtPayload.mockReturnValue({
        source: 'entra',
        grantCode: 'WMP'
      })
      fetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      await server.inject({
        method: 'GET',
        url: '/WMP123456789',
        headers: { 'x-encrypted-auth': 'mock-auth' }
      })
      await server.inject({
        method: 'GET',
        url: '/WMP123456789/print',
        headers: { 'x-encrypted-auth': 'mock-auth' }
      })

      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:3555/WMP123456789',
        expect.objectContaining({
          headers: { 'x-encrypted-auth': 'mock-auth' },
          method: 'GET'
        })
      )
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:3555/WMP123456789',
        expect.objectContaining({
          headers: { 'x-encrypted-auth': 'mock-auth' },
          method: 'GET'
        })
      )
    })

    test('rejects the request when the JWT has no grant code', async () => {
      extractJwtPayload.mockReturnValue({ source: 'defra' })

      const response = await server.inject({
        method: 'GET',
        url: '/',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(response.statusCode).toBe(statusCodes.unauthorized)
      expect(fetch).not.toHaveBeenCalled()
    })

    test('should call the backend API using x-encrypted-auth from query if header is missing', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await server.inject({
        method: 'GET',
        url: '/?x-encrypted-auth=query-auth'
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3555/', {
        headers: {
          'x-encrypted-auth': 'query-auth'
        },
        method: 'GET',
        signal: expect.any(AbortSignal)
      })
    })

    test('should prioritise x-encrypted-auth header over query parameter', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await server.inject({
        method: 'GET',
        url: '/?x-encrypted-auth=query-auth',
        headers: {
          'x-encrypted-auth': 'header-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3555/', {
        headers: {
          'x-encrypted-auth': 'header-auth'
        },
        method: 'GET',
        signal: expect.any(AbortSignal)
      })
    })

    test('should call the backend API including FPTT number', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await server.inject({
        method: 'GET',
        url: '/FPTT123456789',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3555/FPTT123456789',
        {
          headers: {
            'x-encrypted-auth': 'mock-auth'
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )
    })

    test('should call the backend API including FPTT number and mode', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await server.inject({
        method: 'GET',
        url: '/FPTT123456789/print',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3555/FPTT123456789',
        {
          headers: {
            'x-encrypted-auth': 'mock-auth'
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )
    })

    test('should call the backend API with POST data', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await server.inject({
        method: 'POST',
        url: '/',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        },
        payload: {
          action: 'accept-offer'
        }
      })

      expect(fetch).toHaveBeenCalledWith('http://localhost:3555/', {
        headers: {
          'Content-Type': 'application/json',
          'x-encrypted-auth': 'mock-auth'
        },
        method: 'POST',
        body: '{"action":"accept-offer"}',
        signal: expect.any(AbortSignal)
      })
    })
  })

  describe('failure', () => {
    test('should show "problem with the service" error page when the backend fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () =>
          JSON.stringify({
            errorMessage: 'Backend failure {Some detailed stack trace}'
          })
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/FPTT123456789',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3555/FPTT123456789',
        {
          headers: {
            'x-encrypted-auth': 'mock-auth'
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toContain('Sorry, there is a problem with the service')
      expect(result).toContain('Unable to load agreement. Backend failure')
    })

    test('should show "not found" error page when not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({})
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/FPTT123456789',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3555/FPTT123456789',
        {
          headers: {
            'x-encrypted-auth': 'mock-auth'
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )

      expect(statusCode).toBe(statusCodes.notFound)
      expect(result).toContain('Page not found')
    })

    test('should show "not authorised" error page when not authorised', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({})
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/FPTT123456789',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3555/FPTT123456789',
        {
          headers: {
            'x-encrypted-auth': 'mock-auth'
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )

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

  describe('handler', () => {
    test('delegates to configDrivenAgreementController when source is gas', () => {
      const mockRequest = {
        log: vi.fn(),
        pre: {
          data: {
            source: 'gas'
          }
        }
      }
      const mockH = {}
      const expectedResponse = { some: 'response' }
      configDrivenAgreementController.handler.mockReturnValue(expectedResponse)

      const result = agreementController.handler(mockRequest, mockH)

      expect(configDrivenAgreementController.handler).toHaveBeenCalledWith(
        mockRequest,
        mockH
      )
      expect(result).toBe(expectedResponse)
    })

    test('does not delegate to configDrivenAgreementController when source is legacy', () => {
      const action = 'review-offer'
      const mockRequest = {
        log: vi.fn(),
        payload: { action },
        pre: {
          data: {
            source: 'legacy',
            agreementData: { status: 'offered' }
          }
        }
      }
      const mockH = {}
      const expectedResponse = { some: 'response' }
      const mockActionController = {
        handler: vi.fn().mockReturnValue(expectedResponse)
      }
      const chooseController = vi.fn().mockReturnValue(mockActionController)
      const getControllerSpy = vi
        .spyOn(getControllerByActionModule, 'getControllerByAction')
        .mockReturnValue(chooseController)

      const result = agreementController.handler(mockRequest, mockH)

      expect(configDrivenAgreementController.handler).not.toHaveBeenCalled()
      expect(result).toBe(expectedResponse)

      getControllerSpy.mockRestore()
    })

    test('does not delegate to configDrivenAgreementController when pre data is missing', () => {
      const mockRequest = {
        log: vi.fn(),
        pre: {}
      }
      const mockH = {}

      // Should fail later when trying to access status
      expect(() => agreementController.handler(mockRequest, mockH)).toThrow()
      expect(configDrivenAgreementController.handler).not.toHaveBeenCalled()
    })

    test('delegates to the chosen controller handler', () => {
      const action = 'review-offer'
      const request = {
        payload: { action },
        pre: {
          data: {
            agreementData: {
              status: 'offered'
            }
          }
        }
      }
      const mockH = {}
      const expectedResponse = { some: 'response' }
      const mockActionController = {
        handler: vi.fn().mockReturnValue(expectedResponse)
      }
      const chooseController = vi.fn().mockReturnValue(mockActionController)
      const getControllerSpy = vi
        .spyOn(getControllerByActionModule, 'getControllerByAction')
        .mockReturnValue(chooseController)

      const result = agreementController.handler(request, mockH)

      expect(getControllerSpy).toHaveBeenCalledWith('offered')
      expect(chooseController).toHaveBeenCalledWith(action)
      expect(mockActionController.handler).toHaveBeenCalledWith(request, mockH)
      expect(result).toBe(expectedResponse)

      getControllerSpy.mockRestore()
    })

    test('throws when pre handler data is missing entirely', () => {
      const request = {
        payload: { action: 'any-action' }
      }

      expect(() => agreementController.handler(request, {})).toThrow(
        /Cannot read properties of undefined \(reading 'status'\)/
      )
    })

    test('throws when agreement data is missing a status', () => {
      const request = {
        payload: { action: 'any-action' },
        pre: {
          data: {
            agreementData: {}
          }
        }
      }

      expect(() => agreementController.handler(request, {})).toThrow(
        'Agreement is in an unknown state'
      )
    })

    test('throws bad request when the chosen controller has no handler', () => {
      const action = 'unsupported-action'
      const request = {
        payload: { action },
        pre: {
          data: {
            agreementData: {
              status: 'offered'
            }
          }
        }
      }

      const chooseController = vi.fn().mockReturnValue({})
      const getControllerSpy = vi
        .spyOn(getControllerByActionModule, 'getControllerByAction')
        .mockReturnValue(chooseController)

      expect(() => agreementController.handler(request, {})).toThrow(
        `Unrecognised action in POST payload: ${action}`
      )

      expect(getControllerSpy).toHaveBeenCalledWith('offered')
      expect(chooseController).toHaveBeenCalledWith(action)

      getControllerSpy.mockRestore()
    })
  })
})

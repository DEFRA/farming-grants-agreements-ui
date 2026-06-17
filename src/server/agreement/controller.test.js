import { agreementController } from './controller.js'
import { createServer } from '#~/server/server.js'
import * as getControllerByActionModule from '#~/server/common/helpers/get-controller-by-action.js'
import { statusCodes } from '#~/server/common/constants/status-codes.js'
import { config } from '#~/config/config.js'

const buildAuthToken = (payload) =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
      'base64url'
    ),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature'
  ].join('.')

describe('#agreementController', () => {
  let server
  const originalGasAuthToken = config.get('gasBackend.authToken')

  beforeAll(async () => {
    config.set('backend.url', 'http://localhost:3555')
    globalThis.fetch = vi.fn()
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 0 })
  })

  afterEach(() => {
    vi.clearAllMocks()
    config.set('gasBackend.authToken', originalGasAuthToken)
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

    test('should call GAS current agreement when PMF grant context is present without an agreement number', async () => {
      config.set('gasBackend.url', 'http://localhost:3102')
      config.set('gasBackend.authToken', 'gas-service-token')
      const authToken = buildAuthToken({
        sbi: '106284736',
        source: 'defra',
        grantCode: 'pigs-might-fly',
        clientRef: '4c6-6tf-k8n'
      })
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: 'config',
          page: {
            title: 'Review your agreement offer'
          },
          agreement: {
            agreementNumber: 'PMF805700162',
            identifiers: {
              sbi: '106284736'
            }
          },
          components: [
            {
              component: 'heading',
              level: 1,
              text: 'Review your agreement offer'
            },
            {
              component: 'paragraph',
              text: 'Pigs Might Fly agreement content from GAS'
            }
          ],
          actions: [
            {
              href: '/PMF805700162/accept',
              text: 'Continue'
            }
          ]
        })
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/',
        headers: {
          'x-encrypted-auth': authToken,
          'x-base-url': '/agreement'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3102/agreements/current?code=pigs-might-fly&clientRef=4c6-6tf-k8n&sbi=106284736',
        {
          headers: {
            Authorization: 'Bearer gas-service-token',
            'x-encrypted-auth': authToken
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Pigs Might Fly agreement content from GAS')
      expect(result).toContain('href="/agreement/PMF805700162/accept"')
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

    test('should render PMF agreement content from GAS', async () => {
      config.set('gasBackend.url', 'http://localhost:3102')
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: 'config',
          page: {
            title: 'Review your agreement offer'
          },
          agreement: {
            agreementNumber: 'PMF000000001',
            applicant: {
              business: {
                name: 'Mason House Farm'
              },
              customer: {
                name: {
                  first: 'Alex',
                  last: 'Mason'
                }
              }
            },
            identifiers: {
              sbi: '106284736'
            }
          },
          components: [
            {
              component: 'heading',
              level: 1,
              text: 'Review your agreement offer'
            },
            {
              component: 'paragraph',
              text: 'Pigs Might Fly agreement content from GAS'
            }
          ],
          actions: [
            {
              href: '/PMF000000001/accept',
              text: 'Continue'
            }
          ]
        })
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/PMF000000001',
        headers: {
          'x-encrypted-auth': 'mock-auth',
          'x-base-url': '/agreement'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3102/agreements/PMF000000001',
        {
          headers: {
            'x-encrypted-auth': 'mock-auth'
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Review your agreement offer')
      expect(result).toContain('Pigs Might Fly agreement content from GAS')
      expect(result).toContain('href="/agreement/PMF000000001/accept"')
    })

    test('should render config-driven agreements through the read-only view page for entra users', async () => {
      config.set('gasBackend.url', 'http://localhost:3102')
      const authToken = buildAuthToken({ source: 'entra' })
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: 'config',
          page: {
            id: 'view',
            layout: 'document',
            title: 'Pigs Might Fly agreement document'
          },
          agreement: {
            agreementNumber: 'PMF000000001',
            code: 'pigs-might-fly',
            status: 'offered'
          },
          components: [
            {
              component: 'notification-banner',
              title: 'This is a draft version of your agreement',
              items: [
                {
                  component: 'paragraph',
                  text: 'You will receive the final agreement once you accept your agreement offer.'
                }
              ]
            },
            {
              component: 'watermark',
              text: 'DRAFT'
            },
            {
              component: 'heading',
              level: 1,
              text: 'Pigs Might Fly agreement document'
            }
          ],
          actions: []
        })
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/PMF000000001',
        headers: {
          'x-encrypted-auth': authToken,
          'x-base-url': '/agreement'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3102/agreements/PMF000000001?page=view',
        {
          headers: {
            'x-encrypted-auth': authToken
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('This is a draft version of your agreement')
      expect(result).toContain('Pigs Might Fly agreement document')
      expect(result).toContain('view-agreement-has-watermark')
      expect(result).not.toContain('Continue')
    })

    test('should keep config-driven agreements read-only for entra users even when a mode is supplied', async () => {
      config.set('gasBackend.url', 'http://localhost:3102')
      const authToken = buildAuthToken({ source: 'entra' })
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: 'config',
          page: {
            id: 'view',
            layout: 'document',
            title: 'Pigs Might Fly agreement document'
          },
          agreement: {
            agreementNumber: 'PMF000000001',
            code: 'pigs-might-fly',
            status: 'offered'
          },
          components: [],
          actions: []
        })
      })

      await server.inject({
        method: 'GET',
        url: '/PMF000000001/accept',
        headers: {
          'x-encrypted-auth': authToken,
          'x-base-url': '/agreement'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3102/agreements/PMF000000001?page=view',
        {
          headers: {
            'x-encrypted-auth': authToken
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )
    })

    test('should route config-driven print mode to the read-only view page', async () => {
      config.set('gasBackend.url', 'http://localhost:3102')
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: 'config',
          page: {
            id: 'view',
            layout: 'document',
            title: 'Pigs Might Fly agreement document'
          },
          agreement: {
            agreementNumber: 'PMF000000001',
            code: 'pigs-might-fly',
            status: 'offered'
          },
          components: [],
          actions: []
        })
      })

      await server.inject({
        method: 'GET',
        url: '/PMF000000001/print',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3102/agreements/PMF000000001?page=view',
        {
          headers: {
            'x-encrypted-auth': 'mock-auth'
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )
    })

    test('should render PMF action fields returned by GAS', async () => {
      config.set('gasBackend.url', 'http://localhost:3102')
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: 'config',
          page: {
            title: 'Accept your agreement offer'
          },
          agreement: {
            agreementNumber: 'PMF000000001',
            applicant: {
              business: {
                name: 'Mason House Farm'
              },
              customer: {
                name: {
                  first: 'Alex',
                  last: 'Mason'
                }
              }
            },
            identifiers: {
              sbi: '106284736'
            }
          },
          components: [
            {
              component: 'heading',
              level: 1,
              text: 'Accept your agreement offer'
            }
          ],
          actions: [
            {
              action: '/PMF000000001/actions/accept',
              checkbox: {
                name: 'confirm',
                value: 'confirmed',
                text: 'I confirm I accept this agreement offer.'
              },
              fields: [
                { name: 'code', value: 'pigs-might-fly' },
                { name: 'clientRef', value: 'PMF-APP-001' }
              ],
              text: 'Accept agreement offer'
            }
          ]
        })
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/PMF000000001/accept',
        headers: {
          'x-encrypted-auth': 'mock-auth',
          'x-base-url': '/agreement'
        }
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3102/agreements/PMF000000001?page=accept',
        {
          headers: {
            'x-encrypted-auth': 'mock-auth'
          },
          method: 'GET',
          signal: expect.any(AbortSignal)
        }
      )
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Accept your agreement offer')
      expect(result).toContain(
        'action="/agreement/PMF000000001/actions/accept"'
      )
      expect(result).not.toContain('agreementItemId')
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

    test('should route prefixed legacy agreement URLs to the legacy backend', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await server.inject({
        method: 'GET',
        url: '/agreement/FPTT123456789',
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

    test('should submit PMF actions to GAS and render the returned content', async () => {
      config.set('gasBackend.url', 'http://localhost:3102')
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: 'config',
          page: {
            title: 'Agreement acceptance in progress'
          },
          agreement: {
            agreementNumber: 'PMF000000001',
            applicant: {
              business: {
                name: 'Mason House Farm'
              },
              customer: {
                name: {
                  first: 'Alex',
                  last: 'Mason'
                }
              }
            },
            identifiers: {
              sbi: '106284736'
            }
          },
          components: [
            {
              component: 'heading',
              level: 1,
              text: 'Agreement acceptance in progress'
            },
            {
              component: 'paragraph',
              text: 'We have received your agreement acceptance.'
            }
          ]
        })
      })

      const payload = {
        code: 'pigs-might-fly',
        clientRef: 'PMF-APP-001',
        acceptedBy: 'applicant'
      }

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/PMF000000001/actions/accept',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        },
        payload
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3102/agreements/PMF000000001/actions/accept',
        {
          headers: {
            'Content-Type': 'application/json',
            'x-encrypted-auth': 'mock-auth'
          },
          method: 'POST',
          body: JSON.stringify(payload),
          signal: expect.any(AbortSignal)
        }
      )
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Agreement acceptance in progress')
      expect(result).toContain('We have received your agreement acceptance.')
    })

    test('should submit prefixed PMF actions to GAS and render validation errors', async () => {
      config.set('gasBackend.url', 'http://localhost:3102')
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: 'config',
          page: {
            id: 'accept',
            title: 'Accept your agreement offer'
          },
          agreement: {
            agreementNumber: 'PMF000000001',
            code: 'pigs-might-fly',
            clientRef: 'PMF-APP-001',
            status: 'offered'
          },
          components: [
            {
              component: 'heading',
              level: 1,
              text: 'Accept your agreement offer'
            }
          ],
          actions: [
            {
              action: '/PMF000000001/actions/accept',
              checkbox: {
                name: 'confirm',
                value: 'confirmed',
                text: 'I confirm I have read the information in this section and accept this agreement offer.',
                errorMessage: {
                  text: 'Confirm this agreement offer before accepting it'
                }
              },
              fields: [
                { name: 'code', value: 'pigs-might-fly' },
                { name: 'clientRef', value: 'PMF-APP-001' }
              ],
              text: 'Accept agreement offer'
            }
          ],
          errors: [
            {
              href: '#confirm',
              text: 'Confirm this agreement offer before accepting it'
            }
          ]
        })
      })

      const payload = {
        code: 'pigs-might-fly',
        clientRef: 'PMF-APP-001',
        acceptedBy: 'applicant'
      }

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/agreement/PMF000000001/actions/accept',
        headers: {
          'x-encrypted-auth': 'mock-auth'
        },
        payload
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3102/agreements/PMF000000001/actions/accept',
        {
          headers: {
            'Content-Type': 'application/json',
            'x-encrypted-auth': 'mock-auth'
          },
          method: 'POST',
          body: JSON.stringify(payload),
          signal: expect.any(AbortSignal)
        }
      )
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('There is a problem')
      expect(result).toContain(
        'Confirm this agreement offer before accepting it'
      )
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

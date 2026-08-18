import { agreementAuthLifecycle } from './auth-lifecycle.js'

const authToken = 'eyJ.test.token'

const buildRequest = (path = '/') => ({
  path,
  info: { id: 'request-id' },
  headers: {
    'x-cdp-request-id': 'cdp-request-id',
    'x-encrypted-auth': authToken
  },
  raw: {
    req: {
      headers: { 'x-encrypted-auth': authToken },
      rawHeaders: ['x-encrypted-auth', authToken]
    }
  },
  logger: { info: vi.fn() }
})

describe('agreement auth lifecycle diagnostics', () => {
  test('logs authentication state at each lifecycle stage', () => {
    const handlers = new Map()
    const server = {
      ext: vi.fn((stage, handler) => handlers.set(stage, handler))
    }
    const request = buildRequest()
    const h = { continue: Symbol('continue') }

    agreementAuthLifecycle.plugin.register(server)

    for (const [stage, handler] of handlers) {
      expect(handler(request, h)).toBe(h.continue)
      expect(request.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          stage,
          requestId: 'request-id',
          xCdpRequestId: 'cdp-request-id',
          hasAuthHeader: true,
          authTokenType: 'string',
          authTokenLength: authToken.length,
          rawRequestHasAuthHeader: true,
          rawAuthHeaderCount: 1
        }),
        'Agreement JWT lifecycle'
      )
    }
  })

  test('does not log unrelated paths', () => {
    const handlers = []
    const server = {
      ext: vi.fn((_stage, handler) => handlers.push(handler))
    }
    const request = buildRequest('/public/application.js')
    const h = { continue: Symbol('continue') }

    agreementAuthLifecycle.plugin.register(server)
    handlers.forEach((handler) => handler(request, h))

    expect(request.logger.info).not.toHaveBeenCalled()
  })
})

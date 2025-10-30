import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach
} from 'vitest'
import { createServer } from '../server.js'

const {
  viewHandlerMock,
  innerHandlerMock,
  getControllerByActionMock,
  apiRequestMock
} = vi.hoisted(() => {
  return {
    viewHandlerMock: vi.fn(() => 'viewed-agreement'),
    innerHandlerMock: vi.fn(() => 'delegated-handler'),
    // returns a function (called with action) that returns a controller with handler
    getControllerByActionMock: vi.fn(() =>
      vi.fn(() => ({ handler: innerHandlerMock }))
    ),
    apiRequestMock: vi.fn()
  }
})

vi.mock('../view-agreement/controller.js', () => ({
  viewAgreementController: { handler: viewHandlerMock }
}))
vi.mock('../common/helpers/get-controller-by-action.js', () => ({
  getControllerByAction: getControllerByActionMock
}))
vi.mock('../common/helpers/api.js', () => ({
  apiRequest: apiRequestMock
}))

describe('agreement routes – showAgreement short-circuit', () => {
  let server

  beforeAll(async () => {
    globalThis.fetch = vi.fn()
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /{agreementId} short-circuits to viewAgreementController when pre.data.showAgreement is true', async () => {
    apiRequestMock.mockResolvedValueOnce({
      showAgreement: true,
      agreementData: { status: 'ACTIVE' } // status not used when short-circuiting
    })

    const res = await server.inject({
      method: 'GET',
      url: '/SFI987654321',
      headers: { 'x-encrypted-auth': 'mock-auth' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toBe('viewed-agreement')
    expect(viewHandlerMock).toHaveBeenCalledTimes(1)
    expect(getControllerByActionMock).not.toHaveBeenCalled()
  })

  it('GET / short-circuits when pre.data.showAgreement is true', async () => {
    apiRequestMock.mockResolvedValueOnce({
      showAgreement: true,
      agreementData: { status: 'ANY' }
    })

    const res = await server.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-encrypted-auth': 'mock-auth' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toBe('viewed-agreement')
    expect(viewHandlerMock).toHaveBeenCalledTimes(1)
    expect(getControllerByActionMock).not.toHaveBeenCalled()
  })

  it('when showAgreement is falsy, delegates via getControllerByAction', async () => {
    apiRequestMock.mockResolvedValueOnce({
      showAgreement: false,
      agreementData: { status: 'PENDING' }
    })

    const res = await server.inject({
      method: 'POST',
      url: '/SFI999',
      headers: { 'x-encrypted-auth': 'mock-auth' },
      payload: { action: 'submit' }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toBe('delegated-handler')
    expect(viewHandlerMock).not.toHaveBeenCalled()
    expect(getControllerByActionMock).toHaveBeenCalledWith('PENDING')
    expect(innerHandlerMock).toHaveBeenCalledTimes(1)
  })

  it('returns 400 Bad Request when the selected controller has no handler', async () => {
    // Arrange: pre.data present, showAgreement false so we don’t short-circuit
    apiRequestMock.mockResolvedValueOnce({
      showAgreement: false,
      agreementData: {
        _id: 'f00000000000000000000201',
        notificationMessageId: '00000000-0000-4000-8000-000000000401',
        agreementName: 'Example agreement 1',
        correlationId: '00000000-0000-4000-8000-000000000402',
        clientRef: 'client-ref-001',
        code: 'frps-private-beta',
        identifiers: {
          sbi: '900000005',
          frn: '1234567890',
          crn: 'crn',
          defraId: 'defraId',
          _id: 'f00000000000000000000202'
        },
        status: 'offered'
      }
    })

    // Make the action router return a controller with NO handler
    getControllerByActionMock.mockReturnValueOnce(
      vi.fn(() => ({})) // <- missing `handler`
    )

    const res = await server.inject({
      method: 'POST',
      url: '/SFI000',
      headers: { 'x-encrypted-auth': 'mock-auth' },
      payload: { action: 'unknown-action' }
    })

    expect(res.statusCode).toBe(400)
    expect(viewHandlerMock).not.toHaveBeenCalled()
    expect(getControllerByActionMock).toHaveBeenCalledWith('offered')
  })
})

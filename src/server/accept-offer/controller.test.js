import { createServer } from '#~/server/server.js'
import { buildPactAgreement } from '#~/server/common/helpers/sample-data/__test__/pact-agreement.fixture.js'
import { config } from '#~/config/config.js'
import { createConsumerPact } from '#~/contracts/consumer/test-helpers/pact-test-helpers.js'
import { MatchersV2 } from '@pact-foundation/pact'
import { vi } from 'vitest'

vi.mock('#~/server/common/helpers/jwt-auth.js', () => ({
  extractJwtPayload: vi.fn(() => ({ grantCode: 'MOCK' }))
}))

const { like } = MatchersV2

describe('#acceptOfferController', () => {
  describe('before accepting the offer', () => {
    let server

    const provider = createConsumerPact(import.meta.url)

    beforeAll(async () => {
      config.set('gasBackend.legacyGrantCodes', ['MOCK'])
      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server?.stop({ timeout: 0 })
    })

    test('displays the are you sure you want to accept the offer page', async () => {
      return await provider
        .addInteraction()
        .given('A customer has an agreement offer')
        .uponReceiving(
          'a request from the customer to view are you sure you want to accept the offer page'
        )
        .withRequest('GET', '/', (builder) => {
          builder.headers({ 'x-encrypted-auth': 'mock-auth' })
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' })
          builder.jsonBody({
            agreementData: buildPactAgreement(
              { status: like('offered') },
              { useMatchers: true }
            )
          })
        })
        .executeTest(async (mockServer) => {
          config.set('backend.url', mockServer.url)

          const { statusCode, result } = await server.inject({
            method: 'POST',
            url: '/',
            headers: {
              'x-encrypted-auth': 'mock-auth'
            },
            payload: {
              action: 'display-accept'
            }
          })

          expect(statusCode).toBe(200)
          expect(result).toContain('Accept your agreement offer')
          expect(result).toContain('Your agreement will consist of the:')
          expect(result).toContain(
            'you will comply with the obligations under your agreement'
          )
          expect(result).toContain('Accept offer')
        })
    })
  })
})

describe('acceptOfferController handler', () => {
  let acceptOfferController
  let mockedAuditEvent

  const createH = () => ({
    view: vi.fn((template, context) => ({ template, context })),
    redirect: vi.fn((url) => ({ redirect: url }))
  })

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/audit-event.js', () => ({
      auditEvent: vi.fn(),
      AuditEvent: {
        REVIEW_OFFER_CONTINUED: 'REVIEW_OFFER_CONTINUED',
        ACCEPT_OFFER_DECLARATION_CONFIRMED:
          'ACCEPT_OFFER_DECLARATION_CONFIRMED',
        ACCEPT_OFFER_SUBMITTED: 'ACCEPT_OFFER_SUBMITTED'
      }
    }))
    vi.doMock('#~/server/common/helpers/api.js', () => ({
      apiRequest: vi.fn(),
      getBackend: vi.fn(() => 'legacy')
    }))
    ;({ acceptOfferController } = await import('./controller.js'))
    ;({ auditEvent: mockedAuditEvent } =
      await import('#~/server/common/helpers/audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('emits REVIEW_OFFER_CONTINUED audit event when rendering the accept offer view', async () => {
    const h = createH()
    const agreementData = {
      agreementNumber: 'FPTT123',
      code: 'frps-private-beta',
      identifiers: { sbi: '106284736' }
    }
    const request = {
      params: { agreementId: 'FPTT123' },
      payload: { action: 'display-accept' },
      pre: { data: { agreementData } },
      url: { search: '' },
      headers: {},
      query: {}
    }

    await acceptOfferController.handler(request, h)

    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'REVIEW_OFFER_CONTINUED',
      agreementData
    )
  })

  test('renders WMP accept offer view for woodland agreements', async () => {
    const h = createH()
    const agreementData = {
      agreementNumber: 'WMP123',
      code: 'woodland',
      identifiers: { sbi: '106284736' }
    }
    const request = {
      params: { agreementId: 'WMP123' },
      payload: { action: 'display-accept' },
      pre: { data: { agreementData } },
      url: { search: '' },
      headers: {},
      query: {}
    }

    await acceptOfferController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/wmp/accept-offer/accept-offer',
      expect.objectContaining({
        pageTitle: 'Accept your agreement offer',
        termsHref:
          'https://www.gov.uk/government/publications/capital-grants-agreements-terms-and-conditions-2026'
      })
    )
  })

  test('throws bad request for unsupported agreement codes', async () => {
    const h = createH()
    const request = {
      params: { agreementId: 'UNKNOWN123' },
      payload: { action: 'display-accept' },
      pre: {
        data: {
          agreementData: {
            agreementNumber: 'UNKNOWN123',
            code: 'unknown'
          }
        }
      },
      url: { search: '' },
      headers: {},
      query: {}
    }

    await expect(acceptOfferController.handler(request, h)).rejects.toThrow(
      'Unsupported agreement code: unknown'
    )
  })

  test('does not emit audit event when redirecting for accept-offer with offered status', async () => {
    const h = createH()
    const agreementData = {
      agreementNumber: 'FPTT123',
      code: 'frps-private-beta',
      status: 'offered',
      identifiers: { sbi: '106284736' }
    }
    const request = {
      params: { agreementId: 'FPTT123' },
      payload: { action: 'accept-offer' },
      pre: { data: { agreementData } },
      url: { search: '' },
      headers: {},
      query: {}
    }

    await acceptOfferController.handler(request, h)

    expect(mockedAuditEvent).not.toHaveBeenCalled()
  })
})

describe('validateAcceptOfferController handler', () => {
  let validateAcceptOfferController
  let mockedAuditEvent
  let mockedApiRequest

  const createH = () => ({
    view: vi.fn((template, context) => ({ template, context })),
    redirect: vi.fn((url) => ({ redirect: url }))
  })

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/audit-event.js', () => ({
      auditEvent: vi.fn(),
      AuditEvent: {
        ACCEPT_OFFER_DECLARATION_CONFIRMED:
          'ACCEPT_OFFER_DECLARATION_CONFIRMED',
        ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED:
          'ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED',
        ACCEPT_OFFER_SUBMITTED: 'ACCEPT_OFFER_SUBMITTED'
      }
    }))
    vi.doMock('#~/server/common/helpers/api.js', () => ({
      apiRequest: vi.fn(),
      getBackend: vi.fn(() => 'legacy')
    }))
    ;({ validateAcceptOfferController } = await import('./controller.js'))
    ;({ auditEvent: mockedAuditEvent } =
      await import('#~/server/common/helpers/audit-event.js'))
    ;({ apiRequest: mockedApiRequest } =
      await import('#~/server/common/helpers/api.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const agreementData = {
    agreementNumber: 'FPTT123',
    code: 'frps-private-beta',
    identifiers: { sbi: '106284736' }
  }

  const createRequest = (confirm) => ({
    params: { agreementId: 'FPTT123' },
    payload: { confirm },
    pre: { data: { agreementData } },
    url: { search: '' },
    headers: { 'x-encrypted-auth': 'mock-auth' },
    query: {}
  })

  test('emits declaration confirmed and offer submitted when checkbox is confirmed', async () => {
    const { getBackend: mockedGetBackend } =
      await import('#~/server/common/helpers/api.js')
    const h = createH()
    const request = createRequest('confirmed')

    await validateAcceptOfferController.handler(request, h)

    expect(mockedGetBackend).toHaveBeenCalledWith(
      { grantCode: 'MOCK' },
      'FPTT123'
    )
    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'ACCEPT_OFFER_DECLARATION_CONFIRMED',
      agreementData
    )
    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'ACCEPT_OFFER_SUBMITTED',
      agreementData,
      'success'
    )
  })

  test('emits declaration confirmed before offer submitted', async () => {
    const h = createH()
    const request = createRequest('confirmed')
    const callOrder = []
    mockedAuditEvent.mockImplementation((_, event) => callOrder.push(event))

    await validateAcceptOfferController.handler(request, h)

    expect(callOrder).toEqual([
      'ACCEPT_OFFER_DECLARATION_CONFIRMED',
      'ACCEPT_OFFER_SUBMITTED'
    ])
  })

  test('emits declaration not confirmed when checkbox is not ticked', async () => {
    const h = createH()
    const request = createRequest(undefined)

    await validateAcceptOfferController.handler(request, h)

    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED',
      agreementData
    )
    expect(mockedAuditEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      'ACCEPT_OFFER_DECLARATION_CONFIRMED',
      expect.anything()
    )
    expect(mockedAuditEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      'ACCEPT_OFFER_SUBMITTED',
      expect.anything(),
      expect.anything()
    )
  })

  test('renders WMP accept page with WMP validation error when checkbox is not ticked', async () => {
    const h = createH()
    const request = {
      ...createRequest(undefined),
      pre: {
        data: {
          agreementData: {
            agreementNumber: 'WMP123',
            code: 'woodland',
            identifiers: { sbi: '106284736' }
          }
        }
      }
    }

    await validateAcceptOfferController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/wmp/accept-offer/accept-offer',
      expect.objectContaining({
        pageTitle: 'Accept your agreement offer',
        errorMessage: {
          text: 'Select the checkbox to confirm you accept this agreement offer'
        }
      })
    )
  })

  test('emits declaration not confirmed when confirm value is invalid', async () => {
    const h = createH()
    const request = createRequest('invalid-value')

    await validateAcceptOfferController.handler(request, h)

    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED',
      agreementData
    )
  })

  test('does not emit declaration not confirmed when checkbox is confirmed', async () => {
    const h = createH()

    await validateAcceptOfferController.handler(createRequest('confirmed'), h)

    expect(mockedAuditEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      'ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED',
      expect.anything()
    )
  })

  test('emits ACCEPT_OFFER_SUBMITTED with failure status when the API call throws', async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error('API error'))
    const h = createH()
    const request = createRequest('confirmed')

    await expect(
      validateAcceptOfferController.handler(request, h)
    ).rejects.toThrow('API error')

    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'ACCEPT_OFFER_SUBMITTED',
      agreementData,
      'failure'
    )
  })

  test('does not call API when checkbox is not confirmed', async () => {
    const h = createH()

    await validateAcceptOfferController.handler(createRequest(undefined), h)

    expect(mockedApiRequest).not.toHaveBeenCalled()
  })
})

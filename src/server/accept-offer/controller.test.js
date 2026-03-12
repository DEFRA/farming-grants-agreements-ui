import { MatchersV2 } from '@pact-foundation/pact'
import { vi } from 'vitest'

import { createServer } from '#~/server/server.js'
import { buildPactAgreement } from '#~/server/common/helpers/sample-data/__test__/pact-agreement.fixture.js'
import { config } from '#~/config/config.js'
import { createConsumerPact } from '#~/contracts/consumer/pact-test-helpers.js'

const { like } = MatchersV2

describe('#acceptOfferController', () => {
  describe('before accepting the offer', () => {
    let server

    const provider = createConsumerPact(import.meta.url)

    beforeAll(async () => {
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
      apiRequest: vi.fn()
    }))
    ;({ acceptOfferController } = await import('./controller.js'))
    ;({ auditEvent: mockedAuditEvent } = await import(
      '#~/server/common/helpers/audit-event.js'
    ))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('emits REVIEW_OFFER_CONTINUED audit event when rendering the accept offer view', async () => {
    const h = createH()
    const agreementData = {
      agreementNumber: 'FPTT123',
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

  test('does not emit audit event when redirecting for accept-offer with offered status', async () => {
    const h = createH()
    const agreementData = {
      agreementNumber: 'FPTT123',
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
        ACCEPT_OFFER_SUBMITTED: 'ACCEPT_OFFER_SUBMITTED'
      }
    }))
    vi.doMock('#~/server/common/helpers/api.js', () => ({
      apiRequest: vi.fn()
    }))
    ;({ validateAcceptOfferController } = await import('./controller.js'))
    ;({ auditEvent: mockedAuditEvent } = await import(
      '#~/server/common/helpers/audit-event.js'
    ))
    ;({ apiRequest: mockedApiRequest } = await import(
      '#~/server/common/helpers/api.js'
    ))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const createRequest = (confirm) => ({
    params: { agreementId: 'FPTT123' },
    payload: { confirm },
    url: { search: '' },
    headers: { 'x-encrypted-auth': 'mock-auth' },
    query: {}
  })

  test('emits ACCEPT_OFFER_DECLARATION_CONFIRMED and ACCEPT_OFFER_SUBMITTED when checkbox is confirmed', async () => {
    const h = createH()
    const request = createRequest('confirmed')

    await validateAcceptOfferController.handler(request, h)

    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'ACCEPT_OFFER_DECLARATION_CONFIRMED'
    )
    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'ACCEPT_OFFER_SUBMITTED'
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

  test('does not emit any audit events when checkbox is not confirmed', async () => {
    const h = createH()
    const request = createRequest(undefined)

    await validateAcceptOfferController.handler(request, h)

    expect(mockedAuditEvent).not.toHaveBeenCalled()
  })

  test('does not emit any audit events when confirm value is invalid', async () => {
    const h = createH()
    const request = createRequest('invalid-value')

    await validateAcceptOfferController.handler(request, h)

    expect(mockedAuditEvent).not.toHaveBeenCalled()
  })

  test('does not call API when checkbox is not confirmed', async () => {
    const h = createH()
    const request = createRequest(undefined)

    await validateAcceptOfferController.handler(request, h)

    expect(mockedApiRequest).not.toHaveBeenCalled()
  })
})

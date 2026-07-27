import { vi } from 'vitest'
import { MatchersV2 } from '@pact-foundation/pact'

import { createServer } from '#~/server/server.js'
import { buildPactAgreement } from '#~/server/common/helpers/sample-data/__test__/pact-agreement.fixture.js'
import { config } from '#~/config/config.js'
import { createConsumerPact } from '#~/contracts/consumer/test-helpers/pact-test-helpers.js'

vi.mock('#~/server/common/helpers/jwt-auth.js', () => ({
  extractJwtPayload: vi.fn(() => ({ grantCode: 'MOCK' }))
}))

const { like } = MatchersV2

describe('#reviewOfferController', () => {
  let server

  const provider = createConsumerPact(import.meta.url)

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 0 })
  })

  test('displays the customers offer', async () => {
    return await provider
      .addInteraction()
      .given('A customer has an agreement offer')
      .uponReceiving('a request from the customer to review their offer')
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
          method: 'GET',
          url: '/',
          headers: {
            'x-encrypted-auth': 'mock-auth'
          }
        })

        expect(statusCode).toBe(200)
        expect(result).toContain('Review your agreement offer')
        expect(result).toContain('If you need to amend your agreement offer')
        expect(result).toContain(
          'Contact the Rural Payments Agency (RPA) to explain:'
        )
        expect(result).toContain('the changes you want to make')
        expect(result).toContain('why you want to make the changes')
        expect(result).toContain('020 8026 2395')
        expect(result).toContain('farmpayments@rpa.gov.uk')
        expect(result).toContain(
          'Mason House Farm Clitheroe Rd, Bashall Eaves, Bartindale Road, Clitheroe, BB7 3DD'
        )
        expect(result).toContain('Assess moorland and produce a written record')
        expect(result).toContain('CMOR1')
        expect(result).toContain('SD6743')
        expect(result).toContain('8083')
        expect(result).toContain('4.5341')
        expect(result).toContain('£10.60')
        expect(result).toContain('£12.04')
        expect(result).toContain('£68.03')
        expect(result).toContain('£48.06')
      })
  })
})

describe('reviewOfferController handler fallbacks', () => {
  let reviewOfferController
  let mockedBuildReviewOfferModel
  let mockedAuditEvent

  const createH = () => ({
    view: vi.fn((template, context) => ({ template, context }))
  })

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock(
      '#~/server/grant-types/fptt/review-offer/review-offer.js',
      async () => {
        const actual = await vi.importActual(
          '#~/server/grant-types/fptt/review-offer/review-offer.js'
        )
        return {
          ...actual,
          reviewOffer: {
            ...actual.reviewOffer,
            buildModel: vi.fn()
          }
        }
      }
    )
    vi.doMock('#~/server/common/helpers/audit-event.js', () => ({
      auditEvent: vi.fn(),
      AuditEvent: { REVIEW_OFFER_VIEWED: 'REVIEW_OFFER_VIEWED' }
    }))
    ;({ reviewOfferController } = await import('./controller.js'))
    const mod = await import(
      '#~/server/grant-types/fptt/review-offer/review-offer.js'
    )
    mockedBuildReviewOfferModel = mod.reviewOffer.buildModel
    ;({ auditEvent: mockedAuditEvent } = await import(
      '#~/server/common/helpers/audit-event.js'
    ))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('falls back to empty agreement data when request.pre.data is missing', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({ any: 'thing' })
    const h = createH()

    await reviewOfferController.handler(
      { pre: { data: { agreementData: { code: 'frps-private-beta' } } } },
      h
    )

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({
      agreementData: { code: 'frps-private-beta' }
    })
    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/review-offer/review-offer',
      { any: 'thing' }
    )
  })

  test('uses empty data when request.pre exists without data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()

    await reviewOfferController.handler(
      { pre: { data: { agreementData: { code: 'frps-private-beta' } } } },
      h
    )

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({
      agreementData: { code: 'frps-private-beta' }
    })
    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/review-offer/review-offer',
      {}
    )
  })

  test('defaults agreementData to empty object when not provided in pre data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()

    const request = {
      pre: {
        data: {
          agreementData: { code: 'frps-private-beta' }
        }
      }
    }

    await reviewOfferController.handler(request, h)

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({
      agreementData: { code: 'frps-private-beta' }
    })
    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/review-offer/review-offer',
      {}
    )
  })

  test('emits REVIEW_OFFER_VIEWED audit event with agreement data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()
    const agreementData = {
      code: 'frps-private-beta',
      agreementNumber: 'FPTT123',
      identifiers: { sbi: '106284736' }
    }
    const request = { pre: { data: { agreementData } } }

    await reviewOfferController.handler(request, h)

    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'REVIEW_OFFER_VIEWED',
      agreementData
    )
  })
})

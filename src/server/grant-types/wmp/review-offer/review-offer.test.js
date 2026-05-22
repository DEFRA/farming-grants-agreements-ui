import {
  vi,
  describe,
  it,
  expect,
  test,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach
} from 'vitest'

import { MatchersV2 } from '@pact-foundation/pact'

import { createServer } from '#~/server/server.js'
import { buildPactAgreement } from '#~/server/common/helpers/sample-data/__test__/pact-agreement.fixture.js'
import { config } from '#~/config/config.js'
import { createConsumerPact } from '#~/contracts/consumer/test-helpers/pact-test-helpers.js'
import { reviewOffer } from './review-offer.js'

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
    vi.doMock('#~/server/common/helpers/audit-event.js', () => ({
      auditEvent: vi.fn(),
      AuditEvent: { REVIEW_OFFER_VIEWED: 'REVIEW_OFFER_VIEWED' }
    }))
    vi.doMock(
      '#~/server/grant-types/wmp/review-offer/review-offer.js',
      async () => {
        const actual = await vi.importActual(
          '#~/server/grant-types/wmp/review-offer/review-offer.js'
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
    ;({ reviewOfferController } = await import(
      '#~/server/review-offer/controller.js'
    ))
    const mod = await import(
      '#~/server/grant-types/wmp/review-offer/review-offer.js'
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
      { pre: { data: { agreementData: { code: 'woodland' } } } },
      h
    )

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({
      agreementData: { code: 'woodland' }
    })
    expect(h.view).toHaveBeenCalledWith(
      'grant-types/wmp/review-offer/review-offer',
      { any: 'thing' }
    )
  })

  test('uses empty data when request.pre exists without data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()

    await reviewOfferController.handler(
      { pre: { data: { agreementData: { code: 'woodland' } } } },
      h
    )

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({
      agreementData: { code: 'woodland' }
    })
    expect(h.view).toHaveBeenCalledWith(
      'grant-types/wmp/review-offer/review-offer',
      {}
    )
  })

  test('defaults agreementData to empty object when not provided in pre data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()

    const request = {
      pre: {
        data: {
          agreementData: { code: 'woodland' }
        }
      }
    }

    await reviewOfferController.handler(request, h)

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({
      agreementData: { code: 'woodland' }
    })
    expect(h.view).toHaveBeenCalledWith(
      'grant-types/wmp/review-offer/review-offer',
      {}
    )
  })

  test('emits REVIEW_OFFER_VIEWED audit event with agreement data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()
    const agreementData = {
      code: 'woodland',
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

describe('buildWMPReviewOfferModel', () => {
  it('should build the WMP review offer model with summary of actions', () => {
    const agreementData = {
      payment: {
        agreementStartDate: '2026-05-08',
        agreementEndDate: '2027-05-08',
        frequency: 'OneOff',
        agreementTotalPence: 157500,
        annualTotalPence: 157500,
        parcelItems: {},
        agreementLevelItems: {
          1: {
            code: 'WMP1',
            description: 'Produce a woodland management plan',
            version: '1',
            annualPaymentPence: 157500,
            _id: '69fdebc95c8d88a1bfc215ce'
          }
        }
      }
    }

    const result = reviewOffer.buildModel({ agreementData })

    expect(result.pageTitle).toBe('Review your agreement offer')
    expect(result.summaryOfActions).toBeDefined()
    expect(result.summaryOfActions.data).toHaveLength(1)
    expect(result.summaryOfActions.data[0][0].text).toBe(
      'Produce a woodland management plan'
    )
    expect(result.summaryOfActions.data[0][1].text).toBe('WMP1')
    expect(result.summaryOfActions.data[0][2].text).toBe('£1,575')
  })

  it('should handle wrapped agreementData', () => {
    const agreementData = {
      agreementData: {
        payment: {
          agreementLevelItems: {
            1: {
              code: 'WMP1',
              description: 'Produce a woodland management plan',
              annualPaymentPence: 157500
            }
          }
        }
      }
    }

    const result = reviewOffer.buildModel({ agreementData })
    expect(result.summaryOfActions.data[0][1].text).toBe('WMP1')
    expect(result.summaryOfActions.data[0][2].text).toBe('£1,575')
  })

  it('should handle missing payment or agreementLevelItems gracefully', () => {
    const emptyResult = reviewOffer.buildModel({ agreementData: {} })
    expect(emptyResult.summaryOfActions.data).toEqual([])

    const noItemsResult = reviewOffer.buildModel({
      agreementData: { payment: {} }
    })
    expect(noItemsResult.summaryOfActions.data).toEqual([])
  })

  it('should handle multiple agreement level items', () => {
    const agreementData = {
      payment: {
        agreementTotalPence: 15000,
        agreementLevelItems: {
          1: { code: 'A1', description: 'Desc 1', annualPaymentPence: 10000 },
          2: { code: 'A2', description: 'Desc 2', annualPaymentPence: 5000 }
        }
      }
    }
    const result = reviewOffer.buildModel({ agreementData })
    expect(result.summaryOfActions.data).toHaveLength(2)
    expect(result.summaryOfActions.data[0][1].text).toBe('A1')
    expect(result.summaryOfActions.data[1][1].text).toBe('A2')
    expect(result.summaryOfActions.data[0][2].text).toBe('£100')
    expect(result.summaryOfActions.data[1][2].text).toBe('£50')
  })
})

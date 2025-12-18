import { vi } from 'vitest'
import path from 'node:path'

import { Pact, MatchersV2 } from '@pact-foundation/pact'

import { createServer } from '../server.js'
import { expectedAgreement } from '../common/helpers/sample-data/__test__/expected-agreement.mock.js'
import { config } from '../../config/config.js'

const { like } = MatchersV2

describe('#reviewOfferController', () => {
  let server

  const provider = new Pact({
    consumer: 'farming-grants-agreements-ui-rest',
    provider: 'farming-grants-agreements-api-rest',
    dir: path.resolve('src', 'contracts', 'consumer', 'pacts'),
    pactfileWriteMode: 'update'
  })

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
          agreementData: { ...expectedAgreement, status: like('offered') }
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
        expect(result).toContain('£12.01')
        expect(result).toContain('£48.06')
      })
  })
})

describe('reviewOfferController handler fallbacks', () => {
  let reviewOfferController
  let mockedBuildReviewOfferModel

  const createH = () => ({
    view: vi.fn((template, context) => ({ template, context }))
  })

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('../common/helpers/build-review-offer-model.js', () => ({
      buildReviewOfferModel: vi.fn()
    }))
    ;({ reviewOfferController } = await import('./controller.js'))
    ;({ buildReviewOfferModel: mockedBuildReviewOfferModel } = await import(
      '../common/helpers/build-review-offer-model.js'
    ))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('falls back to empty agreement data when request.pre.data is missing', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({ any: 'thing' })
    const h = createH()

    await reviewOfferController.handler({}, h)

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({})
    expect(h.view).toHaveBeenCalledWith(
      'review-offer/index',
      expect.objectContaining({
        pageTitle: 'Review your agreement offer'
      })
    )
  })

  test('uses empty data when request.pre exists without data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()

    await reviewOfferController.handler({ pre: {} }, h)

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({})
    expect(h.view).toHaveBeenCalledWith(
      'review-offer/index',
      expect.objectContaining({
        pageTitle: 'Review your agreement offer'
      })
    )
  })

  test('defaults agreementData to empty object when not provided in pre data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()

    const request = {
      pre: {
        data: {
          other: 'value'
        }
      }
    }

    await reviewOfferController.handler(request, h)

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({})
    expect(h.view).toHaveBeenCalledWith(
      'review-offer/index',
      expect.objectContaining({
        pageTitle: 'Review your agreement offer'
      })
    )
  })
})

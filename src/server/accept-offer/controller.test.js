import { MatchersV2 } from '@pact-foundation/pact'

import { createServer } from '../server.js'
import { buildPactAgreement } from '../common/helpers/sample-data/__test__/pact-agreement.fixture.js'
import { config } from '../../config/config.js'
import { createConsumerPact } from '../../contracts/consumer/pact-test-helpers.js'

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

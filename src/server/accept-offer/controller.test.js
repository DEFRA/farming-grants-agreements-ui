import path from 'node:path'

import { MatchersV2, Pact } from '@pact-foundation/pact'

import { createServer } from '../server.js'
import { expectedAgreement } from '../common/helpers/sample-data/__test__/expected-agreement.mock.js'
import { config } from '../../config/config.js'

const { like } = MatchersV2

describe('#acceptOfferController', () => {
  describe('before accepting the offer', () => {
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
            agreementData: { ...expectedAgreement, status: like('offered') }
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

import path from 'node:path'

import { Pact, MatchersV2 } from '@pact-foundation/pact'

import { createServer } from '../server.js'
import { expectedAgreement } from '../common/helpers/sample-data/__test__/expected-agreement.mock.js'
import { config } from '../../config/config.js'

const { like } = MatchersV2

describe('#acceptOfferController', () => {
  describe('after accepting the offer', () => {
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

    test('sends the offer accepted action to the backend and redirects to the offer accepted page', async () => {
      return await provider
        .addInteraction()
        .given('A customer has an agreement offer')
        .uponReceiving('a request from the customer to accept their offer')
        .withRequest('POST', '/SFI987654321', (builder) => {
          builder.headers({
            'Content-Type': 'application/json',
            'x-encrypted-auth': 'mock-auth'
          })
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' })
          builder.jsonBody({
            agreementData: {
              ...expectedAgreement,
              status: like('offered')
            }
          })
        })
        .executeTest(async (mockServer) => {
          config.set('backend.url', mockServer.url)

          const { statusCode, headers } = await server.inject({
            method: 'POST',
            url: '/SFI987654321',
            headers: {
              'x-encrypted-auth': 'mock-auth'
            },
            payload: {
              action: 'accept-offer'
            }
          })

          expect(statusCode).toBe(302)
          expect(headers.location).toBe('/SFI987654321')
        })
    })
  })
})

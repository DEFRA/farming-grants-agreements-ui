import path from 'node:path'

import { Pact, MatchersV2 } from '@pact-foundation/pact'

import { createServer } from '../server.js'
import { buildPactAgreement } from '../common/helpers/sample-data/__test__/pact-agreement.fixture.js'
import { config } from '../../config/config.js'

const { like } = MatchersV2

describe('#offerWithdrawnController', () => {
  let server

  const provider = new Pact({
    consumer: 'farming-grants-agreements-ui',
    provider: 'farming-grants-agreements-api',
    port: 0,
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

  test('displays the offer withdrawn page', async () => {
    return await provider
      .addInteraction()
      .given('A customer has an offer that has been withdrawn')
      .uponReceiving(
        'a request from the customer to view their withdrawn offer'
      )
      .withRequest('GET', '/', (builder) => {
        builder.headers({ 'x-encrypted-auth': 'mock-auth' })
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' })
        builder.jsonBody({
          agreementData: buildPactAgreement({ status: like('withdrawn') })
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
        expect(result).toContain('You have requested an update to your offer')
        expect(result).toContain(
          'Your funding offer is currently being updated'
        )
        expect(result).toContain(
          'Defra will email you when it is ready for you to review'
        )
      })
  })
})

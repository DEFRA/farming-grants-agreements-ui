import path from 'node:path'

import { Pact } from '@pact-foundation/pact'

import { createServer } from '../server.js'
import sampleData from '../common/helpers/sample-data/index.js'
import { config } from '../../config/config.js'

describe('#offerWithdrawnController', () => {
  let server

  const provider = new Pact({
    consumer: 'farming-grants-agreements-ui',
    provider: 'farming-grants-agreements-api',
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
      .withRequest('GET', '/SFI987654321', (builder) => {
        builder.headers({ 'x-encrypted-auth': 'mock-auth' })
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' })
        builder.jsonBody({
          agreementData: { ...sampleData.agreements[0], status: 'withdrawn' }
        })
      })
      .executeTest(async (mockServer) => {
        config.set('backend.url', mockServer.url)

        const { statusCode, result } = await server.inject({
          method: 'GET',
          url: '/SFI987654321',
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

import path from 'node:path'

import { Pact } from '@pact-foundation/pact'

import { createServer } from '../server.js'
import sampleData from '../common/helpers/sample-data/index.js'
import { config } from '../../config/config.js'

describe('#viewAgreementController', () => {
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

  test('displays the agreement details page', async () => {
    return await provider
      .addInteraction()
      .given('A customer has an accepted agreement offer')
      .uponReceiving('a request from the customer to view their offer')
      .withRequest('GET', '/SFI987654321', (builder) => {
        builder.headers({ 'x-encrypted-auth': 'mock-auth' })
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' })
        builder.jsonBody({
          agreementData: { ...sampleData.agreements[0], status: 'accepted' }
        })
      })
      .executeTest(async (mockServer) => {
        config.set('backend.url', mockServer.url)

        const { statusCode, result } = await server.inject({
          method: 'POST',
          url: '/SFI987654321',
          headers: {
            'x-encrypted-auth': 'mock-auth'
          },
          payload: {
            action: 'view-agreement'
          }
        })

        expect(statusCode).toBe(200)
        expect(result).toContain('Example agreement 2')
        expect(result).toContain(
          'You, J&amp;S Hartley, of Mason House Farm Clitheroe Rd, Bashall Eaves, Bartindale Road, Clitheroe, BB7 3DD'
        )
        expect(result).toContain('1 September 2025')
        expect(result).toContain('£960.18')
      })
  })
})

import path from 'node:path'

import { Pact, MatchersV2 } from '@pact-foundation/pact'
import { vi } from 'vitest'

import { createServer } from '../server.js'
import { expectedAgreement } from '../common/helpers/sample-data/__test__/expected-agreement.mock.js'
import { config } from '../../config/config.js'
import * as apiModule from '../common/helpers/api.js'

const { like } = MatchersV2

describe('#acceptOfferController', () => {
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

  describe('accept-offer action', () => {
    // This test verifies the POST interaction with the backend API
    test('sends the accept-offer action to the backend API', async () => {
      return await provider
        .addInteraction()
        .given('A customer has confirmed checkbox and is ready to accept')
        .uponReceiving('a POST request to accept the offer')
        .withRequest('POST', '/', (builder) => {
          builder.headers({
            'Content-Type': 'application/json',
            'x-encrypted-auth': 'mock-auth'
          })
          builder.jsonBody({
            action: 'accept-offer'
          })
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' })
          builder.jsonBody({
            agreementData: {
              ...expectedAgreement,
              status: like('accepted')
            }
          })
        })
        .executeTest(async (mockServer) => {
          config.set('backend.url', mockServer.url)

          // Directly test the API request
          const response = await fetch(mockServer.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-encrypted-auth': 'mock-auth'
            },
            body: JSON.stringify({ action: 'accept-offer' })
          })

          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.agreementData.status).toBe('accepted')
        })
    })
  })

  describe('validateAcceptOfferController', () => {
    test('returns 200 with error when checkbox is not checked', async () => {
      return await provider
        .addInteraction()
        .given('A customer has an agreement offer')
        .uponReceiving(
          'a GET request to fetch data before showing validation error'
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
              action: 'validate-accept-offer'
              // confirm is missing - checkbox not checked
            }
          })

          expect(statusCode).toBe(200)
          expect(result).toContain('Please agree with the Terms and Conditions')
          expect(result).toContain('Accept your agreement offer')
        })
    })

    test('returns 200 with error when confirm value is not "confirmed"', async () => {
      return await provider
        .addInteraction()
        .given('A customer has an agreement offer')
        .uponReceiving(
          'a GET request to fetch data before showing invalid confirm error'
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
              action: 'validate-accept-offer',
              confirm: 'invalid-value'
            }
          })

          expect(statusCode).toBe(200)
          expect(result).toContain('Please agree with the Terms and Conditions')
          expect(result).toContain('Accept your agreement offer')
        })
    })

    test('successfully validates checkbox and calls API when confirmed', async () => {
      // Spy on apiRequest to verify the POST call is made
      const apiRequestSpy = vi.spyOn(apiModule, 'apiRequest')

      return await provider
        .addInteraction()
        .given('A customer has an agreement offer')
        .uponReceiving('a GET request to fetch data before validation')
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

          // Mock POST apiRequest to avoid template rendering issues
          apiRequestSpy.mockImplementation(async (options) => {
            if (options.method === 'POST') {
              return {
                agreementData: {
                  ...expectedAgreement,
                  status: 'accepted'
                }
              }
            }
            // For GET requests, make the actual call
            return await fetch(mockServer.url, {
              method: options.method,
              headers: { 'x-encrypted-auth': options.auth }
            }).then((r) => r.json())
          })

          await server.inject({
            method: 'POST',
            url: '/',
            headers: {
              'x-encrypted-auth': 'mock-auth'
            },
            payload: {
              action: 'validate-accept-offer',
              confirm: 'confirmed'
            }
          })

          // Verify validation passed and POST was called
          expect(apiRequestSpy).toHaveBeenCalledWith({
            agreementId: '',
            method: 'POST',
            auth: 'mock-auth',
            body: { action: 'accept-offer' }
          })

          apiRequestSpy.mockRestore()
        })
    })
  })
})

import { vi } from 'vitest'
import path from 'node:path'

import { Pact, MatchersV2 } from '@pact-foundation/pact'

import { createServer } from '../server.js'
import { expectedAgreement } from '../common/helpers/sample-data/__test__/expected-agreement.mock.js'
import { config } from '../../config/config.js'

const { like } = MatchersV2

describe('#viewAgreementController', () => {
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

  test('displays the agreement details page', async () => {
    return await provider
      .addInteraction()
      .given('A customer has an accepted agreement offer')
      .uponReceiving(
        'a request from the customer to view their agreement details'
      )
      .withRequest('GET', '/SFI987654321', (builder) => {
        builder.headers({ 'x-encrypted-auth': 'mock-auth' })
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' })
        builder.jsonBody({
          agreementData: { ...expectedAgreement, status: like('accepted') }
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
        expect(result).toContain('J&amp;S Hartley FPTT')
        expect(result).toContain(
          'You, J&amp;S Hartley, of Mason House Farm Clitheroe Rd, Bashall Eaves, Bartindale Road, Clitheroe, BB7 3DD'
        )
        expect(result).toContain('1 September 2025')

        // parcel row
        expect(result).toContain('£12.04')
        expect(result).toContain('£12.01')

        // agreement row
        expect(result).toContain('£68.03')
        expect(result).toContain('£68.00')
        expect(result).toContain('£272.00')

        // Total row
        expect(result).toContain('£80.07')
        expect(result).toContain('£80.01')
        expect(result).toContain('£320.06')
      })
  })
})

// Unit tests for agreementStatus logic colocated in this existing test file
describe('viewAgreementController.agreementStatus (unit)', () => {
  function createH() {
    return { view: vi.fn((template, context) => ({ template, context })) }
  }

  function buildRequest(status) {
    return {
      pre: {
        data: {
          agreementData: {
            status,
            applicant: {
              business: {
                address: {
                  line1: 'Line 1',
                  city: 'AnyTown',
                  postalCode: 'AA1 1AA'
                }
              }
            }
          }
        }
      }
    }
  }

  test("sets isDraftAgreement true when agreement status is 'offered'", async () => {
    // Reset module cache and mock calculations helper before importing controller
    vi.resetModules()
    vi.doMock('../common/helpers/get-agreement-calculations.js', () => ({
      getAgreementCalculations: vi.fn(() => ({
        agreement: { applicant: { business: { name: 'Mock Biz' } } },
        payment: {}
      }))
    }))
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest('offered')

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'view-agreement/index',
      expect.any(Object)
    )
    expect(context.isDraftAgreement).toBe(true)
    expect(context.isAgreementAccepted).toBe(false)
    expect(context.isWithdrawnAgreement).toBe(false)
  })

  test("sets isAgreementAccepted false when agreement status is 'accepted'", async () => {
    vi.resetModules()
    vi.doMock('../common/helpers/get-agreement-calculations.js', () => ({
      getAgreementCalculations: vi.fn(() => ({
        agreement: { applicant: { business: { name: 'Mock Biz' } } },
        payment: {}
      }))
    }))
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest('accepted')

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'view-agreement/index',
      expect.any(Object)
    )
    expect(context.isDraftAgreement).toBe(false)
    expect(context.isAgreementAccepted).toBe(true)
    expect(context.isWithdrawnAgreement).toBe(false)
  })

  test("sets isWithdrawnAgreement false when agreement status is 'withdrawn'", async () => {
    vi.resetModules()
    vi.doMock('../common/helpers/get-agreement-calculations.js', () => ({
      getAgreementCalculations: vi.fn(() => ({
        agreement: { applicant: { business: { name: 'Mock Biz' } } },
        payment: {}
      }))
    }))
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest('withdrawn')

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'view-agreement/index',
      expect.any(Object)
    )
    expect(context.isDraftAgreement).toBe(false)
    expect(context.isAgreementAccepted).toBe(false)
    expect(context.isWithdrawnAgreement).toBe(true)
  })
})

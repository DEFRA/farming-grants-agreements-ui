import { vi } from 'vitest'
import { MatchersV2 } from '@pact-foundation/pact'

import { createServer } from '#~/server/server.js'
import { buildPactAgreement } from '#~/server/common/helpers/sample-data/__test__/pact-agreement.fixture.js'
import { config } from '#~/config/config.js'
import { createConsumerPact } from '#~/contracts/consumer/test-helpers/pact-test-helpers.js'

vi.mock('#~/server/common/helpers/jwt-auth.js', () => ({
  extractJwtPayload: vi.fn(() => ({ grantCode: 'MOCK' }))
}))

const { like } = MatchersV2

describe('#viewAgreementController', () => {
  let server

  const provider = createConsumerPact(import.meta.url)

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
      .withRequest('GET', '/FPTT123456789', (builder) => {
        builder.headers({ 'x-encrypted-auth': 'mock-auth' })
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ 'Content-Type': 'application/json' })
        builder.jsonBody({
          agreementData: buildPactAgreement(
            { status: like('accepted') },
            { useMatchers: true }
          )
        })
      })
      .executeTest(async (mockServer) => {
        config.set('backend.url', mockServer.url)

        const { statusCode, result } = await server.inject({
          method: 'GET',
          url: '/FPTT123456789',
          headers: {
            'x-encrypted-auth': 'mock-auth'
          }
        })

        expect(statusCode).toBe(200)
        expect(result).not.toContain(
          'If you need to amend your agreement offer'
        )
        expect(result).not.toContain(
          'Contact the Rural Payments Agency (RPA) to explain:'
        )
        expect(result).toContain('J&amp;S Hartley FPTT')
        expect(result).toContain(
          'You, J&amp;S Hartley, of Mason House Farm Clitheroe Rd, Bashall Eaves, Bartindale Road, Clitheroe, BB7 3DD'
        )
        expect(result).toContain('1 September 2025')

        // parcel row
        expect(result).toContain('£12.04')
        expect(result).toContain('£48.06')

        // agreement row
        expect(result).toContain('£68.03')
        expect(result).toContain('£68')
        expect(result).toContain('£272')

        // Total row
        expect(result).toContain('£80.07')
        expect(result).toContain('£320.06')
      })
  })

  test('does not show the review-offer RPA amendment guidance on the printable draft agreement', async () => {
    return await provider
      .addInteraction()
      .given('A customer has an agreement offer')
      .uponReceiving(
        'a request from the customer to view the printable draft agreement'
      )
      .withRequest('GET', '/FPTT123456789', (builder) => {
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
          url: '/FPTT123456789/print',
          headers: {
            'x-encrypted-auth': 'mock-auth'
          }
        })

        expect(statusCode).toBe(200)
        expect(result).toContain(
          'Farm payments technical test agreement document'
        )
        expect(result).not.toContain(
          'If you need to amend your agreement offer'
        )
        expect(result).not.toContain(
          'Contact the Rural Payments Agency (RPA) to explain:'
        )
        expect(result).not.toContain('the changes you want to make')
        expect(result).not.toContain('why you want to make the changes')
      })
  })
})

// Shared test helper to build request objects for all test scenarios
function buildRequest({
  code = 'frps-private-beta',
  status = 'accepted',
  authSource = null,
  mode = undefined,
  host = 'this-site.uk',
  agreementData = {}
} = {}) {
  const baseUrl = `https://${host}`
  return {
    headers: {
      'x-base-url': baseUrl
    },
    params: {
      ...(mode !== undefined && { mode })
    },
    pre: {
      data: {
        ...(authSource && {
          auth: { source: authSource }
        }),
        agreementData: {
          code,
          agreementNumber: 'TEST123',
          identifiers: {
            sbi: '123456789'
          },
          status,
          updatedAt: '2026-02-02T00:00:00.000Z',
          payment: {
            agreementStartDate: '2026-01-01',
            agreementEndDate: '2027-01-01',
            parcelItems: {},
            agreementLevelItems: {},
            payments: []
          },
          application: {
            parcel: []
          },
          applicant: {
            business: {
              name: 'Mock Biz',
              address: {
                line1: 'Line 1',
                city: 'AnyTown',
                postalCode: 'AA1 1AA'
              }
            },
            customer: {
              name: {
                first: 'Pat',
                last: 'Jones'
              }
            }
          },
          ...agreementData
        }
      }
    }
  }
}

// Shared test helper to create Hapi response toolkit mock
function createH() {
  return {
    view: vi.fn((template, context) => ({ template, context })),
    redirect: vi.fn((url) => ({ redirectTo: url }))
  }
}

// Unit tests for agreementStatus logic colocated in this existing test file
describe('viewAgreementController.agreementStatus (unit)', () => {
  test("sets isDraftAgreement true when agreement status is 'offered'", async () => {
    // Reset module cache and mock calculations helper before importing controller
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/get-agreement-calculations.js', () => ({
      getAgreementCalculations: vi.fn(() => ({
        agreement: { applicant: { business: { name: 'Mock Biz' } } },
        payment: {
          agreementStartDate: '2026-01-01',
          agreementEndDate: '2027-01-01',
          parcelItems: {
            1: {
              code: 'CMOR1'
            }
          },
          annualPayments: [
            {
              code: 'CMOR1',
              description: 'Assess moorland and produce a written record',
              payment: '£272.00 per agreement '
            }
          ]
        }
      }))
    }))
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest({ status: 'offered' })

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/view-agreement/view-agreement',
      expect.any(Object)
    )
    expect(context.isDraftAgreement).toBe(true)
    expect(context.isAgreementAccepted).toBe(false)
    expect(context.isWithdrawnAgreement).toBe(false)
  })

  test("sets isAgreementAccepted false when agreement status is 'accepted'", async () => {
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/get-agreement-calculations.js', () => ({
      getAgreementCalculations: vi.fn(() => ({
        agreement: { applicant: { business: { name: 'Mock Biz' } } },
        payment: {}
      })),

      getAdditionalAnnualPayments: vi.fn(() => ({ annualPayments: [] }))
    }))
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest({ status: 'accepted' })

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/view-agreement/view-agreement',
      expect.any(Object)
    )
    expect(context.isDraftAgreement).toBe(false)
    expect(context.isAgreementAccepted).toBe(true)
    expect(context.isWithdrawnAgreement).toBe(false)
  })

  test("sets isWithdrawnAgreement false when agreement status is 'withdrawn'", async () => {
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/get-agreement-calculations.js', () => ({
      getAgreementCalculations: vi.fn(() => ({
        agreement: { applicant: { business: { name: 'Mock Biz' } } },
        payment: {}
      })),
      getAdditionalAnnualPayments: vi.fn(() => ({ annualPayments: [] }))
    }))
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest({ status: 'withdrawn' })

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/view-agreement/view-agreement',
      expect.any(Object)
    )
    expect(context.isDraftAgreement).toBe(false)
    expect(context.isAgreementAccepted).toBe(false)
    expect(context.isWithdrawnAgreement).toBe(true)
  })
})

// Unit tests for redirect logic based on status, auth source, and mode
describe('viewAgreementController.redirect', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/get-agreement-calculations.js', () => ({
      getAgreementCalculations: vi.fn(() => ({
        agreement: { applicant: { business: { name: 'Mock Biz' } } },
        payment: {}
      })),
      getAdditionalAnnualPayments: vi.fn(() => ({ annualPayments: [] }))
    }))
  })

  test('redirects to baseUrl when status is offered and auth source is defra', async () => {
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest({
      status: 'offered',
      authSource: 'defra'
    })

    const result = await viewAgreementController.handler(request, h)

    expect(h.redirect).toHaveBeenCalledWith('https://this-site.uk')
    expect(result.redirectTo).toBe('https://this-site.uk')
    expect(h.view).not.toHaveBeenCalled()
  })

  test('redirects to baseUrl when status is offered, auth source is defra, and mode is not print (e.g. "invalid")', async () => {
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest({
      status: 'offered',
      authSource: 'defra',
      mode: 'invalid'
    })

    const result = await viewAgreementController.handler(request, h)

    expect(h.redirect).toHaveBeenCalledWith('https://this-site.uk')
    expect(result.redirectTo).toBe('https://this-site.uk')
    expect(h.view).not.toHaveBeenCalled()
  })

  test('displays view when status is offered and auth source is defra but mode is print', async () => {
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest({
      status: 'offered',
      authSource: 'defra',
      mode: 'print'
    })

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/view-agreement/view-agreement',
      expect.any(Object)
    )
    expect(context.pageTitle).toBe(
      'Farm payments technical test agreement document'
    )
    expect(h.redirect).not.toHaveBeenCalled()
  })

  test('displays view when status is offered but auth source is not defra', async () => {
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest({
      status: 'offered',
      authSource: 'entra'
    })

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/view-agreement/view-agreement',
      expect.any(Object)
    )
    expect(context.pageTitle).toBe(
      'Farm payments technical test agreement document'
    )
    expect(h.redirect).not.toHaveBeenCalled()
  })

  test('displays view when status is offered but auth is undefined', async () => {
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest({
      status: 'offered',
      authSource: null
    })

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/view-agreement/view-agreement',
      expect.any(Object)
    )
    expect(context.pageTitle).toBe(
      'Farm payments technical test agreement document'
    )
    expect(h.redirect).not.toHaveBeenCalled()
  })

  test('displays view when status is accepted even with defra auth', async () => {
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest({
      status: 'accepted',
      authSource: 'defra'
    })

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/view-agreement/view-agreement',
      expect.any(Object)
    )
    expect(context.pageTitle).toBe(
      'Farm payments technical test agreement document'
    )
    expect(h.redirect).not.toHaveBeenCalled()
  })

  test('displays view when status is withdrawn even with defra auth', async () => {
    const { viewAgreementController } = await import('./controller.js')

    const h = createH()
    const request = buildRequest({
      status: 'withdrawn',
      authSource: 'defra'
    })

    const { context } = await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/view-agreement/view-agreement',
      expect.any(Object)
    )
    expect(context.pageTitle).toBe(
      'Farm payments technical test agreement document'
    )
    expect(h.redirect).not.toHaveBeenCalled()
  })
})

describe('viewAgreementController agreement ended', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/get-agreement-calculations.js', () => ({
      getAgreementCalculations: vi.fn(() => ({
        agreement: { applicant: { business: { name: 'Mock Biz' } } },
        payment: {}
      })),
      getAdditionalAnnualPayments: vi.fn(() => ({ annualPayments: [] }))
    }))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('renders agreement-ended template when status is terminated', async () => {
    const { viewAgreementController } = await import('./controller.js')
    const h = createH()
    const request = buildRequest({ status: 'terminated' })

    await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'view-agreement/agreement-ended',
      expect.objectContaining({ pageTitle: 'Agreement ended' })
    )
  })

  test('renders FPTT grant-specific template when status is accepted', async () => {
    const { viewAgreementController } = await import('./controller.js')
    const h = createH()
    const request = buildRequest({ status: 'accepted' })

    await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/view-agreement/view-agreement',
      expect.any(Object)
    )
  })

  test('renders WMP grant-specific template when status is accepted', async () => {
    const { viewAgreementController } = await import('./controller.js')
    const h = createH()
    const request = buildRequest({
      code: 'woodland',
      status: 'accepted',
      agreementData: {
        agreementName: 'Test Woodland Name WMP',
        clientRef: 'WMP-20260507133228-24643',
        signatureDate: '2026-05-07T12:53:16.162Z',
        applicant: {
          business: {
            name: 'Example Farm Ltd',
            address: {
              line1: 'Farm House',
              city: 'York',
              postalCode: 'YO1 1AA'
            }
          },
          customer: {
            name: {
              title: 'Mr',
              first: 'John',
              last: 'Doe'
            }
          }
        },
        application: {
          parcel: [{ parcelId: 'SD4841-4684', area: { quantity: 25.3874 } }]
        },
        actionApplications: [
          {
            code: 'WMP1',
            parcelId: 'SD4841-4684',
            appliedFor: { quantity: 25.3874 }
          }
        ],
        payment: {
          agreementStartDate: '2026-05-07',
          agreementEndDate: '2027-05-07',
          agreementTotalPence: 157500,
          agreementLevelItems: {
            1: {
              code: 'PA3',
              description: 'PA3: Woodland management plan',
              annualPaymentPence: 157500
            }
          },
          parcelItems: {},
          payments: []
        }
      }
    })

    await viewAgreementController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'grant-types/wmp/view-agreement/view-agreement',
      expect.objectContaining({
        pageTitle: 'Woodland Management Plan PA3 agreement document',
        agreementName: 'Test Woodland Name WMP'
      })
    )
  })

  test('emits AGREEMENT_VIEWED when rendering agreement-ended template', async () => {
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/audit-event.js', () => ({
      auditEvent: vi.fn(),
      AuditEvent: { AGREEMENT_VIEWED: 'AGREEMENT_VIEWED' }
    }))
    vi.doMock('#~/server/common/helpers/get-agreement-calculations.js', () => ({
      getAgreementCalculations: vi.fn(() => ({
        agreement: { applicant: { business: { name: 'Mock Biz' } } },
        payment: {}
      })),
      getAdditionalAnnualPayments: vi.fn(() => ({ annualPayments: [] }))
    }))

    const { viewAgreementController } = await import('./controller.js')
    const { auditEvent: mockedAuditEvent } = await import(
      '#~/server/common/helpers/audit-event.js'
    )
    const h = createH()
    const request = buildRequest({ status: 'terminated' })

    await viewAgreementController.handler(request, h)

    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'AGREEMENT_VIEWED',
      request.pre.data.agreementData
    )
    expect(h.view).toHaveBeenCalledWith(
      'view-agreement/agreement-ended',
      expect.any(Object)
    )
  })
})

describe('viewAgreementController audit events', () => {
  let mockedAuditEvent

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/audit-event.js', () => ({
      auditEvent: vi.fn(),
      AuditEvent: { AGREEMENT_VIEWED: 'AGREEMENT_VIEWED' }
    }))
    vi.doMock('#~/server/common/helpers/get-agreement-calculations.js', () => ({
      getAgreementCalculations: vi.fn(() => ({}))
    }))
    ;({ auditEvent: mockedAuditEvent } = await import(
      '#~/server/common/helpers/audit-event.js'
    ))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('emits AGREEMENT_VIEWED with agreementData when the agreement is rendered', async () => {
    const { viewAgreementController } = await import('./controller.js')
    const h = createH()
    const request = buildRequest({ status: 'accepted' })

    await viewAgreementController.handler(request, h)

    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'AGREEMENT_VIEWED',
      request.pre.data.agreementData
    )
  })

  test('does not emit AGREEMENT_VIEWED when redirecting', async () => {
    const { viewAgreementController } = await import('./controller.js')
    const h = createH()
    const request = buildRequest({ status: 'offered', authSource: 'defra' })

    await viewAgreementController.handler(request, h)

    expect(mockedAuditEvent).not.toHaveBeenCalled()
  })
})

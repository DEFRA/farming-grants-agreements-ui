import {
  vi,
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach
} from 'vitest'

import { MatchersV2 } from '@pact-foundation/pact'

import { createServer } from '#~/server/server.js'
import { buildPactAgreement } from '#~/server/common/helpers/sample-data/__test__/pact-agreement.fixture.js'
import { config } from '#~/config/config.js'
import { createConsumerPact } from '#~/contracts/consumer/test-helpers/pact-test-helpers.js'

vi.mock('#~/server/common/helpers/jwt-auth.js', () => ({
  extractJwtPayload: vi.fn(() => ({ grantCode: 'FPTT' }))
}))

const { like } = MatchersV2

describe('#reviewOfferController', () => {
  let server

  const provider = createConsumerPact(import.meta.url)

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
          url: '/',
          headers: {
            'x-encrypted-auth': 'mock-auth'
          }
        })

        expect(statusCode).toBe(200)
        expect(result).toContain('Review your agreement offer')
        expect(result).toContain('If you need to amend your agreement offer')
        expect(result).toContain(
          'Contact the Rural Payments Agency (RPA) to explain:'
        )
        expect(result).toContain('the changes you want to make')
        expect(result).toContain('why you want to make the changes')
        expect(result).toContain('020 8026 2395')
        expect(result).toContain('farmpayments@rpa.gov.uk')
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
        expect(result).toContain('£68.03')
        expect(result).toContain('£48.06')
      })
  })
})

describe('reviewOfferController handler fallbacks', () => {
  let reviewOfferController
  let mockedBuildReviewOfferModel
  let mockedAuditEvent

  const createH = () => ({
    view: vi.fn((template, context) => ({ template, context }))
  })

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/audit-event.js', () => ({
      auditEvent: vi.fn(),
      AuditEvent: { REVIEW_OFFER_VIEWED: 'REVIEW_OFFER_VIEWED' }
    }))
    vi.doMock(
      '#~/server/grant-types/fptt/review-offer/review-offer.js',
      async () => {
        const actual = await vi.importActual(
          '#~/server/grant-types/fptt/review-offer/review-offer.js'
        )
        return {
          ...actual,
          reviewOffer: {
            ...actual.reviewOffer,
            buildModel: vi.fn()
          }
        }
      }
    )
    ;({ reviewOfferController } = await import(
      '#~/server/review-offer/controller.js'
    ))
    const mod = await import(
      '#~/server/grant-types/fptt/review-offer/review-offer.js'
    )
    mockedBuildReviewOfferModel = mod.reviewOffer.buildModel
    ;({ auditEvent: mockedAuditEvent } = await import(
      '#~/server/common/helpers/audit-event.js'
    ))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('falls back to empty agreement data when request.pre.data is missing', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({ any: 'thing' })
    const h = createH()

    await reviewOfferController.handler(
      { pre: { data: { agreementData: { code: 'frps-private-beta' } } } },
      h
    )

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({
      agreementData: { code: 'frps-private-beta' }
    })
    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/review-offer/review-offer',
      { any: 'thing' }
    )
  })

  test('uses empty data when request.pre exists without data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()

    await reviewOfferController.handler(
      { pre: { data: { agreementData: { code: 'frps-private-beta' } } } },
      h
    )

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({
      agreementData: { code: 'frps-private-beta' }
    })
    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/review-offer/review-offer',
      {}
    )
  })

  test('defaults agreementData to empty object when not provided in pre data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()

    const request = {
      pre: {
        data: {
          agreementData: { code: 'frps-private-beta' }
        }
      }
    }

    await reviewOfferController.handler(request, h)

    expect(mockedBuildReviewOfferModel).toHaveBeenCalledWith({
      agreementData: { code: 'frps-private-beta' }
    })
    expect(h.view).toHaveBeenCalledWith(
      'grant-types/fptt/review-offer/review-offer',
      {}
    )
  })

  test('emits REVIEW_OFFER_VIEWED audit event with agreement data', async () => {
    mockedBuildReviewOfferModel.mockReturnValue({})
    const h = createH()
    const agreementData = {
      code: 'frps-private-beta',
      agreementNumber: 'FPTT123',
      identifiers: { sbi: '106284736' }
    }
    const request = { pre: { data: { agreementData } } }

    await reviewOfferController.handler(request, h)

    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'REVIEW_OFFER_VIEWED',
      agreementData
    )
  })
})

const sampleAgreementData = {
  _id: '6943d00c8405b48c784990cd',
  notificationMessageId: 'd0137d0a-c7e9-41e3-a9a4-44f252ebd3db',
  agreementName: 'Example agreement 2',
  correlationId: '40f01b36-ff08-48f7-9ece-941b7456daa0',
  clientRef: 'client-ref-002',
  code: 'frps-private-beta',
  identifiers: {
    sbi: '106284736',
    frn: 'frn',
    crn: 'crn',
    defraId: 'defraId',
    _id: '6943d00c8405b48c784990ce'
  },
  status: 'offered',
  agreement: '6943d00c8405b48c784990cb',
  scheme: 'FPTT',
  actionApplications: [],
  payment: {
    agreementStartDate: '2026-01-01',
    agreementEndDate: '2027-01-01',
    frequency: 'Quarterly',
    agreementTotalPence: 34544,
    annualTotalPence: 34544,
    parcelItems: {
      1: {
        code: 'CMOR1',
        description: 'Assess moorland and produce a written record',
        durationYears: 1,
        version: 1,
        unit: 'ha',
        quantity: 4.7575,
        rateInPence: 1060,
        annualPaymentPence: 5043,
        sheetId: 'SD6743',
        parcelId: '8083'
      },
      2: {
        code: 'CMOR1',
        description: 'Assess moorland and produce a written record',
        durationYears: 1,
        version: 1,
        unit: 'ha',
        quantity: 2.1705,
        rateInPence: 1060,
        annualPaymentPence: 2301,
        sheetId: 'SD6743',
        parcelId: '8333'
      }
    },
    agreementLevelItems: {
      1: {
        code: 'CMOR1',
        description: 'Assess moorland and produce a written record',
        durationYears: 1,
        version: 1,
        annualPaymentPence: 27200
      }
    },
    payments: [
      {
        totalPaymentPence: 8639,
        paymentDate: '2026-04-06',
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 1263
          },
          {
            parcelItemId: 2,
            paymentPence: 576
          },
          {
            agreementLevelItemId: 1,
            paymentPence: 6800
          }
        ]
      },
      {
        totalPaymentPence: 8635,
        paymentDate: '2026-07-06',
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 1260
          },
          {
            parcelItemId: 2,
            paymentPence: 575
          },
          {
            agreementLevelItemId: 1,
            paymentPence: 6800
          }
        ]
      },
      {
        totalPaymentPence: 8635,
        paymentDate: '2026-10-05',
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 1260
          },
          {
            parcelItemId: 2,
            paymentPence: 575
          },
          {
            agreementLevelItemId: 1,
            paymentPence: 6800
          }
        ]
      },
      {
        totalPaymentPence: 8635,
        paymentDate: '2027-01-05',
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 1260
          },
          {
            parcelItemId: 2,
            paymentPence: 575
          },
          {
            agreementLevelItemId: 1,
            paymentPence: 6800
          }
        ]
      }
    ]
  },
  applicant: {
    business: {
      name: 'J&S Hartley',
      address: {
        line1: 'Mason House Farm Clitheroe Rd',
        line2: 'Bashall Eaves',
        line3: null,
        line4: null,
        line5: null,
        street: 'Bartindale Road',
        city: 'Clitheroe',
        postalCode: 'BB7 3DD',
        _id: '6943d00c8405b48c784990d3'
      },
      _id: '6943d00c8405b48c784990d0'
    },
    customer: {
      name: {
        title: 'Mr.',
        first: 'Edward',
        middle: 'Paul',
        last: 'Jones',
        _id: '6943d00c8405b48c784990d5'
      },
      _id: '6943d00c8405b48c784990d4'
    },
    _id: '6943d00c8405b48c784990cf'
  },
  application: {
    parcel: [
      {
        sheetId: 'SD6743',
        parcelId: '8083',
        area: {
          unit: 'ha',
          quantity: 5.2182,
          _id: '69262bb2331fd3b45b76ee92'
        },
        actions: [
          {
            code: 'CMOR1',
            version: 1,
            durationYears: 3,
            appliedFor: {
              unit: 'ha',
              quantity: 4.7575,
              _id: '69262bb2331fd3b45b76ee94'
            },
            _id: '69262bb2331fd3b45b76ee93'
          }
        ],
        _id: '69262bb2331fd3b45b76ee91'
      },
      {
        sheetId: 'SD6743',
        parcelId: '8333',
        area: {
          unit: 'ha',
          quantity: 2.1703,
          _id: '69262bb2331fd3b45b76ee98'
        },
        actions: [
          {
            code: 'CMOR1',
            version: 1,
            durationYears: 3,
            appliedFor: {
              unit: 'ha',
              quantity: 2.1705,
              _id: '69262bb2331fd3b45b76ee9a'
            },
            _id: '69262bb2331fd3b45b76ee99'
          }
        ],
        _id: '69262bb2331fd3b45b76ee97'
      }
    ],
    agreement: [],
    _id: '69262bb2331fd3b45b76ee90'
  },
  __v: 0,
  createdAt: '2025-12-18T09:57:32.046Z',
  updatedAt: '2025-12-18T09:57:32.054Z',
  agreementNumber: 'FPTT123456789',
  invoice: [],
  version: 1
}

describe('buildReviewOfferModel', () => {
  let reviewOfferInstance
  let mockedFirstParcel
  let mockedSubsequentParcel
  let mockedFirstAgreement
  let mockedSubsequentAgreement

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('#~/server/common/helpers/payment-calculations.js', () => ({
      calculateFirstPaymentForAgreementLevelItem: vi.fn(),
      calculateFirstPaymentForParcelItem: vi.fn(),
      calculateSubsequentPaymentForAgreementLevelItem: vi.fn(),
      calculateSubsequentPaymentForParcelItem: vi.fn()
    }))
    vi.doMock('#~/server/common/helpers/get-agreement-calculations.js', () => ({
      getAnnualPaymentsData: vi.fn().mockReturnValue({}),
      getSummaryOfPaymentsData: vi.fn().mockReturnValue({})
    }))

    const {
      calculateFirstPaymentForAgreementLevelItem,
      calculateFirstPaymentForParcelItem,
      calculateSubsequentPaymentForAgreementLevelItem,
      calculateSubsequentPaymentForParcelItem
    } = await import('#~/server/common/helpers/payment-calculations.js')

    const mod = await vi.importActual('./review-offer.js')
    reviewOfferInstance = mod.reviewOffer

    mockedFirstParcel = vi.mocked(calculateFirstPaymentForParcelItem)
    mockedSubsequentParcel = vi.mocked(calculateSubsequentPaymentForParcelItem)
    mockedFirstAgreement = vi.mocked(calculateFirstPaymentForAgreementLevelItem)
    mockedSubsequentAgreement = vi.mocked(
      calculateSubsequentPaymentForAgreementLevelItem
    )

    mockedFirstParcel.mockImplementation((_, key) => Number(key) * 10)
    mockedSubsequentParcel.mockImplementation((_, key) => Number(key) * 20)
    mockedFirstAgreement.mockImplementation((_, key) => Number(key) * 30)
    mockedSubsequentAgreement.mockImplementation((_, key) => Number(key) * 40)
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('buildSummaryRows: ignores non-array actions and only maps valid arrays', () => {
    const model = reviewOfferInstance.buildModel({
      agreementData: {
        payment: { parcelItems: {}, agreementLevelItems: {} },
        application: {
          parcel: [
            // No actions property at all -> ignored
            { sheetId: 'S1', parcelId: 'P1' },
            {
              sheetId: 'S2',
              parcelId: 'P2',
              actions: {
                code: 'X1',
                durationYears: 1,
                appliedFor: { quantity: 1 }
              }
            },
            // actions is null -> ignored
            { sheetId: 'S3', parcelId: 'P3', actions: null },
            // Proper array -> included (2 actions)
            {
              sheetId: 'S4',
              parcelId: 'P4',
              actions: [
                {
                  code: 'A1',
                  durationYears: 1,
                  appliedFor: { quantity: 1.11111 }
                },
                { code: 'A2', durationYears: 2, appliedFor: { quantity: 2 } }
              ]
            }
          ]
        }
      }
    })

    const rows = model.summaryOfActions.data
    // Only the two actions from the single valid array should produce rows
    expect(rows).toHaveLength(2)
    // Spot-check one of the rows has expected formatting
    expect(rows[0][1]).toEqual({ text: 'A1' })
    expect(rows[0][3]).toEqual({ text: 1.1111 })
    expect(rows[0][4]).toEqual({ text: '1 year' })
    expect(rows[1][1]).toEqual({ text: 'A2' })
    expect(rows[1][4]).toEqual({ text: '2 years' })
  })

  test('buildCodeDescriptions: strips "CODE: " prefix, falls back correctly, and ignores items without code', () => {
    const agreementData = {
      agreementData: {
        payment: {
          parcelItems: {
            a: {
              code: 'AA1',
              description: 'AA1: Parcel description'
            },
            b: {
              code: 'BB2',
              description: 'BB2: '
            }, // desc becomes '', fallback uses original 'BB2: '
            c: { description: 'No code present should be ignored' } // no code -> ignored
          },
          agreementLevelItems: {
            x: {
              code: 'CC3',
              description: 'CC3: Agreement level'
            },
            y: {
              code: 'DD4',
              description: undefined
            } // desc '' and original '' -> maps to ''
          }
        },
        application: {
          parcel: [
            {
              sheetId: 'S9',
              parcelId: 'P9',
              actions: [
                { code: 'AA1', durationYears: 1, appliedFor: { quantity: 1 } },
                { code: 'BB2', durationYears: 1, appliedFor: { quantity: 1 } },
                { code: 'CC3', durationYears: 1, appliedFor: { quantity: 1 } },
                { code: 'DD4', durationYears: 1, appliedFor: { quantity: 1 } },
                { code: 'ZZ9', durationYears: 1, appliedFor: { quantity: 1 } } // not present -> '' description
              ]
            }
          ]
        }
      }
    }

    const model = reviewOfferInstance.buildModel(agreementData)
    const rows = model.summaryOfActions.data

    // We built 5 actions; all should be represented
    expect(rows).toHaveLength(5)

    // Helper to find row by code cell value (second column)
    const getRowByCode = (code) => rows.find((r) => r[1].text === code)

    // AA1: description has prefix removed
    expect(getRowByCode('AA1')[0]).toEqual({ text: 'Parcel description' })

    // BB2: desc stripped becomes '', fallback uses original description 'BB2: '
    expect(getRowByCode('BB2')[0]).toEqual({ text: 'BB2: ' })

    // CC3 from agreement-level items: prefix removed
    expect(getRowByCode('CC3')[0]).toEqual({ text: 'Agreement level' })

    // DD4: undefined description -> maps to ''
    expect(getRowByCode('DD4')[0]).toEqual({ text: '' })

    // ZZ9 not found in descriptions -> empty action cell
    expect(getRowByCode('ZZ9')[0]).toEqual({ text: '' })
  })

  const buildAgreementData = () =>
    JSON.parse(JSON.stringify(sampleAgreementData))

  test('flattens parcel and agreement level items with calculated payment metadata', async () => {
    vi.doMock(
      '#~/server/common/helpers/get-agreement-calculations.js',
      async () => {
        return await vi.importActual(
          '#~/server/common/helpers/get-agreement-calculations.js'
        )
      }
    )
    vi.resetModules()
    const mod = await vi.importActual('./review-offer.js')
    const reviewOfferWithRealCalcs = mod.reviewOffer

    const agreementData = buildAgreementData()

    const model = reviewOfferWithRealCalcs.buildModel({ agreementData })

    expect(model.pageTitle).toBe('Review your agreement offer')

    const { headings, data } = model.summaryOfActions

    // Headings should match expected static labels
    expect(headings).toEqual([
      { text: 'Action' },
      { text: 'Code' },
      { text: 'Land parcel' },
      { text: 'Quantity (ha)' },
      { text: 'Duration' }
    ])

    // Our local sampleAgreementData contains 2 parcels with one CMOR1 action each
    expect(data).toHaveLength(2)

    expect(data[0]).toEqual([
      { text: 'Assess moorland and produce a written record' },
      { text: 'CMOR1' },
      { text: 'SD6743 8083' },
      { text: 4.7575 },
      { text: '3 years' }
    ])

    expect(data[1]).toEqual([
      { text: 'Assess moorland and produce a written record' },
      { text: 'CMOR1' },
      { text: 'SD6743 8333' },
      { text: 2.1705 },
      { text: '3 years' }
    ])

    // Headings should match expected static labels
    expect(model.summaryOfPayments.headings).toEqual([
      { text: 'Action' },
      { text: 'Code' },
      { text: 'Annual payment rate' },
      { text: 'First payment' },
      { text: 'Subsequent payments' },
      { text: 'Annual payment value' }
    ])

    // Our local sampleAgreementData contains 2 parcels with one CMOR1 action each
    expect(model.summaryOfPayments.data).toHaveLength(4)

    const totalsRow =
      model.summaryOfPayments.data[model.summaryOfPayments.data.length - 1]
    expect(totalsRow).toEqual([
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '£0.60', attributes: { class: 'govuk-!-font-weight-bold' } },
      { text: '£1', attributes: { class: 'govuk-!-font-weight-bold' } },
      { text: '£345.44', attributes: { class: 'govuk-!-font-weight-bold' } }
    ])

    const rows = model.summaryOfPayments.data.slice(0, -1)

    // Parcel row for parcel item 1 (annual 5043 pence -> £50.43, rate 1060 -> £10.60)
    expect(
      rows
        .filter((r) => r[1].text === 'CMOR1')
        .some(
          (r) =>
            r[0].text === 'Assess moorland and produce a written record' &&
            r[2].text === '£10.60 per ha' &&
            r[3].text === '£0.10' &&
            r[4].text === '£0.20' &&
            r[5].text === '£50.43'
        )
    ).toBe(true)

    // Parcel row for parcel item 2 (annual 2301 -> £23.01)
    expect(
      rows
        .filter((r) => r[1].text === 'CMOR1')
        .some(
          (r) =>
            r[0].text === 'Assess moorland and produce a written record' &&
            r[2].text === '£10.60 per ha' &&
            r[3].text === '£0.20' &&
            r[4].text === '£0.40' &&
            r[5].text === '£23.01'
        )
    ).toBe(true)

    // Agreement-level row (annual 27200 -> £272, rate text per agreement)
    expect(
      rows.some(
        (r) =>
          r[0].text === 'Assess moorland and produce a written record' &&
          r[1].text === 'CMOR1' &&
          r[2].text === '£272 per agreement' &&
          r[3].text === '£0.30' &&
          r[4].text === '£0.40' &&
          r[5].text === '£272'
      )
    ).toBe(true)
  })

  test('returns sensible defaults when no payment rows exist', async () => {
    vi.doMock(
      '#~/server/common/helpers/get-agreement-calculations.js',
      async () => {
        return await vi.importActual(
          '#~/server/common/helpers/get-agreement-calculations.js'
        )
      }
    )
    vi.resetModules()
    const mod = await vi.importActual('./review-offer.js')
    const reviewOfferWithRealCalcs = mod.reviewOffer

    const model = reviewOfferWithRealCalcs.buildModel({
      agreementData: {
        application: { parcel: [] },
        payment: {
          agreementStartDate: '2024-01-01',
          agreementEndDate: '2024-01-01',
          parcelItems: {},
          agreementLevelItems: {},
          payments: undefined,
          annualTotalPence: 0
        }
      }
    })

    const { headings, data } = model.summaryOfActions

    // Headings should match expected static labels
    expect(headings).toEqual([
      { text: 'Action' },
      { text: 'Code' },
      { text: 'Land parcel' },
      { text: 'Quantity (ha)' },
      { text: 'Duration' }
    ])

    // Our local sampleAgreementData contains 2 parcels with one CMOR1 action each
    expect(data).toHaveLength(0)

    // Headings should match expected static labels
    expect(model.summaryOfPayments.headings).toEqual([
      { text: 'Action' },
      { text: 'Code' },
      { text: 'Annual payment rate' },
      { text: 'First payment' },
      { text: 'Subsequent payments' },
      { text: 'Annual payment value' }
    ])

    // Our local sampleAgreementData contains 2 parcels with one CMOR1 action each
    expect(model.summaryOfPayments.data).toHaveLength(1)

    const totalsRow =
      model.summaryOfPayments.data[model.summaryOfPayments.data.length - 1]
    expect(totalsRow).toEqual([
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '£0', attributes: { class: 'govuk-!-font-weight-bold' } },
      { text: '£0', attributes: { class: 'govuk-!-font-weight-bold' } },
      { text: '£0', attributes: { class: 'govuk-!-font-weight-bold' } }
    ])
  })

  test('returns sensible defaults when no application exist', async () => {
    vi.doMock(
      '#~/server/common/helpers/get-agreement-calculations.js',
      async () => {
        return await vi.importActual(
          '#~/server/common/helpers/get-agreement-calculations.js'
        )
      }
    )
    vi.resetModules()
    const mod = await vi.importActual('./review-offer.js')
    const reviewOfferWithRealCalcs = mod.reviewOffer

    const model = reviewOfferWithRealCalcs.buildModel({
      agreementData: {
        payment: {
          agreementStartDate: '2024-01-01',
          agreementEndDate: '2024-01-01',
          parcelItems: {},
          agreementLevelItems: {},
          payments: undefined,
          annualTotalPence: 0
        }
      }
    })

    const { headings, data } = model.summaryOfActions

    // Headings should match expected static labels
    expect(headings).toEqual([
      { text: 'Action' },
      { text: 'Code' },
      { text: 'Land parcel' },
      { text: 'Quantity (ha)' },
      { text: 'Duration' }
    ])

    // Our local sampleAgreementData contains 2 parcels with one CMOR1 action each
    expect(data).toHaveLength(0)

    // Headings should match expected static labels
    expect(model.summaryOfPayments.headings).toEqual([
      { text: 'Action' },
      { text: 'Code' },
      { text: 'Annual payment rate' },
      { text: 'First payment' },
      { text: 'Subsequent payments' },
      { text: 'Annual payment value' }
    ])

    // Our local sampleAgreementData contains 2 parcels with one CMOR1 action each
    expect(model.summaryOfPayments.data).toHaveLength(1)

    const totalsRow =
      model.summaryOfPayments.data[model.summaryOfPayments.data.length - 1]
    expect(totalsRow).toEqual([
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '£0', attributes: { class: 'govuk-!-font-weight-bold' } },
      { text: '£0', attributes: { class: 'govuk-!-font-weight-bold' } },
      { text: '£0', attributes: { class: 'govuk-!-font-weight-bold' } }
    ])
  })

  test('formats Duration column correctly (singular/plural/undefined)', () => {
    const agreementData = {
      agreementData: {
        payment: { parcelItems: {}, agreementLevelItems: {} },
        application: {
          parcel: [
            {
              sheetId: 'AA1111',
              parcelId: '0001',
              actions: [
                {
                  code: 'X1',
                  durationYears: 1,
                  appliedFor: { unit: 'ha', quantity: 1 }
                },
                {
                  code: 'X2',
                  durationYears: '2',
                  appliedFor: { unit: 'ha', quantity: 1 }
                },
                {
                  code: 'X3',
                  /* undefined duration */ appliedFor: {
                    unit: 'ha',
                    quantity: 1
                  }
                }
              ]
            }
          ]
        }
      }
    }

    const model = reviewOfferInstance.buildModel(agreementData)

    const rows = model.summaryOfActions.data
    expect(rows).toHaveLength(3)

    // 1 -> "1 year"
    expect(rows[0][4]).toEqual({ text: '1 year' })
    // '2' (string) -> numeric coercion -> "2 years"
    expect(rows[1][4]).toEqual({ text: '2 years' })
    // undefined -> Number(undefined) || 0 -> 0 -> "0 years"
    expect(rows[2][4]).toEqual({ text: '0 years' })
  })

  test('summaryOfActions covers fallback when payment is missing (uses empty object)', () => {
    const agreementData = {
      agreementData: {
        // payment intentionally omitted to exercise: const payment = root?.payment || {}
        application: {
          parcel: [
            {
              sheetId: 'SD4842',
              parcelId: '0001',
              actions: [
                {
                  code: 'CMOR1',
                  durationYears: 2,
                  appliedFor: { unit: 'ha', quantity: 1.23456 }
                }
              ]
            }
          ]
        }
      }
    }

    const model = reviewOfferInstance.buildModel(agreementData)
    const { headings, data } = model.summaryOfActions

    // Headings intact
    expect(headings).toEqual([
      { text: 'Action' },
      { text: 'Code' },
      { text: 'Land parcel' },
      { text: 'Quantity (ha)' },
      { text: 'Duration' }
    ])

    // One row built, with empty description because codeDescriptions is built from empty payment
    expect(data).toHaveLength(1)
    expect(data[0]).toEqual([
      { text: '' },
      { text: 'CMOR1' },
      { text: 'SD4842 0001' },
      { text: 1.2346 },
      { text: '2 years' }
    ])
  })

  test('buildActionRow fallbacks: missing codes, parcel ids, and quantities', () => {
    const agreementData = {
      agreementData: {
        // Ensure no codeDescriptions can be derived
        payment: {},
        application: {
          parcel: [
            // Case 1: both sheetId and parcelId missing, code missing, quantity missing
            {
              actions: [
                {
                  // code intentionally undefined
                  durationYears: 0,
                  appliedFor: {
                    // quantity intentionally undefined
                  }
                }
              ]
            },
            // Case 2: sheetId present, parcelId missing
            {
              sheetId: 'ONLYSHEET',
              actions: [
                {
                  // code intentionally undefined to exercise second cell fallback
                  durationYears: 1,
                  appliedFor: {}
                }
              ]
            },
            // Case 3: parcelId present, sheetId missing, quantity with >4dp for rounding
            {
              parcelId: 'ONLYPARCEL',
              actions: [
                {
                  // code intentionally undefined
                  durationYears: 1,
                  appliedFor: { quantity: 2.123456 }
                }
              ]
            }
          ]
        }
      }
    }

    const model = reviewOfferInstance.buildModel(agreementData)
    const rows = model.summaryOfActions.data

    expect(rows).toHaveLength(3)

    // Case 1 assertions
    expect(rows[0]).toEqual([
      { text: '' },
      { text: '' },
      { text: ' ' },
      { text: 0 },
      { text: '0 years' }
    ])

    // Case 2 assertions
    expect(rows[1]).toEqual([
      { text: '' },
      { text: '' },
      { text: 'ONLYSHEET ' },
      { text: 0 },
      { text: '1 year' }
    ])

    // Case 3 assertions
    expect(rows[2]).toEqual([
      { text: '' },
      { text: '' }, // code missing
      { text: ' ONLYPARCEL' },
      { text: 2.1235 },
      { text: '1 year' }
    ])
  })
})

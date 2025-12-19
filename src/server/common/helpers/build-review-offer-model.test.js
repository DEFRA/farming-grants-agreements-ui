import { vi } from 'vitest'

import { buildReviewOfferModel } from './build-review-offer-model.js'
import {
  calculateFirstPaymentForAgreementLevelItem,
  calculateFirstPaymentForParcelItem,
  calculateSubsequentPaymentForAgreementLevelItem,
  calculateSubsequentPaymentForParcelItem,
  calculateTotalFirstPayment,
  calculateTotalSubsequentPayment
} from './payment-calculations.js'
// Note: Use the real implementation of getSummaryOfPaymentsData via
// buildReviewOfferModel to validate its output based on sample data

vi.mock('./payment-calculations.js', () => ({
  calculateFirstPaymentForAgreementLevelItem: vi.fn(),
  calculateFirstPaymentForParcelItem: vi.fn(),
  calculateSubsequentPaymentForAgreementLevelItem: vi.fn(),
  calculateSubsequentPaymentForParcelItem: vi.fn(),
  calculateTotalFirstPayment: vi.fn(),
  calculateTotalSubsequentPayment: vi.fn()
}))

// Intentionally do not mock get-agreement-calculations so we can assert
// the actual summaryOfPayments structure and values.

const mockedFirstParcel = vi.mocked(calculateFirstPaymentForParcelItem)
const mockedSubsequentParcel = vi.mocked(
  calculateSubsequentPaymentForParcelItem
)
const mockedFirstAgreement = vi.mocked(
  calculateFirstPaymentForAgreementLevelItem
)
const mockedSubsequentAgreement = vi.mocked(
  calculateSubsequentPaymentForAgreementLevelItem
)
const mockedTotalFirst = vi.mocked(calculateTotalFirstPayment)
const mockedTotalSubsequent = vi.mocked(calculateTotalSubsequentPayment)

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
  scheme: 'SFI',
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
      email: {
        address: 'cliffspencetasabbeyfarmf@mrafyebbasatecnepsffilcm.com.test',
        _id: '6943d00c8405b48c784990d1'
      },
      phone: {
        mobile: '01234031670',
        _id: '6943d00c8405b48c784990d2'
      },
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
  agreementNumber: 'SFI987654321',
  invoice: [],
  version: 1
}

describe('buildReviewOfferModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedFirstParcel.mockImplementation((_, key) => Number(key) * 10)
    mockedSubsequentParcel.mockImplementation((_, key) => Number(key) * 20)
    mockedFirstAgreement.mockImplementation((_, key) => Number(key) * 30)
    mockedSubsequentAgreement.mockImplementation((_, key) => Number(key) * 40)
    mockedTotalFirst.mockReturnValue(123456)
    mockedTotalSubsequent.mockReturnValue(654321)
  })

  const buildAgreementData = () =>
    JSON.parse(JSON.stringify(sampleAgreementData))

  test('flattens parcel and agreement level items with calculated payment metadata', () => {
    const agreementData = buildAgreementData()

    const model = buildReviewOfferModel(agreementData)

    expect(model.pageTitle).toBe('Review your agreement offer')
    // expect(model.codeDescriptions).toEqual({
    //   CMOR1: 'Assess moorland and produce a written record'
    // })

    // payments should contain 3 rows (2 parcel rows + 1 agreement level row)
    // expect(model.payments).toHaveLength(3)
    // const parcelRow = model.payments.find((row) => row.parcelId === '8083')
    // expect(parcelRow).toMatchObject({
    //   code: 'CMOR1',
    //   description: 'Assess moorland and produce a written record',
    //   unit: 'ha',
    //   duration: 1,
    //   hasOneOffPayment: false,
    //   rateInPence: '£10.60',
    //   quarterlyPayment: 1260,
    //   firstPaymentPence: 10,
    //   subsequentPaymentPence: 20
    // })
    //
    // const agreementLevelRow = model.payments.find(
    //   (row) => row.hasOneOffPayment === true
    // )
    // expect(agreementLevelRow).toMatchObject({
    //   code: 'CMOR1',
    //   description: 'Assess moorland and produce a written record',
    //   rateInPence: '£272 per agreement',
    //   duration: 1,
    //   hasOneOffPayment: true,
    //   quarterlyPayment: 6800,
    //   firstPaymentPence: 30,
    //   subsequentPaymentPence: 40
    // })

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

  test('returns sensible defaults when no payment rows exist', () => {
    mockedTotalFirst.mockReturnValue(0)
    mockedTotalSubsequent.mockReturnValue(0)

    const model = buildReviewOfferModel({
      application: { parcel: [] },
      payment: {
        agreementStartDate: '2024-01-01',
        agreementEndDate: '2024-01-01',
        parcelItems: {},
        agreementLevelItems: {},
        payments: undefined,
        annualTotalPence: 0
      }
    })

    // parcels are no longer exposed on the model; ensure other fields are sane
    // expect(model.codeDescriptions).toEqual({})
    // expect(model.payments).toEqual([])

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

    expect(mockedFirstParcel).not.toHaveBeenCalled()
    expect(mockedSubsequentParcel).not.toHaveBeenCalled()
    expect(mockedFirstAgreement).not.toHaveBeenCalled()
    expect(mockedSubsequentAgreement).not.toHaveBeenCalled()
  })

  test('handles missing parcelItems by falling back to an empty object', () => {
    buildReviewOfferModel({
      application: { parcel: [] },
      payment: {
        agreementStartDate: '2024-01-01',
        agreementEndDate: '2025-01-01',
        parcelItems: undefined,
        agreementLevelItems: {},
        payments: [],
        annualTotalPence: 0
      }
    })
    // expect(model.payments).toEqual([])
    expect(mockedFirstParcel).not.toHaveBeenCalled()
    expect(mockedSubsequentParcel).not.toHaveBeenCalled()
  })

  test('builds summaryOfActions with correct headings and rows using existing sampleAgreementData', () => {
    const agreementData = buildAgreementData()

    const model = buildReviewOfferModel(agreementData)
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

    // First row corresponds to parcel SD6743 8083, CMOR1 action
    expect(data[0]).toEqual([
      { text: 'Assess moorland and produce a written record' },
      { text: 'CMOR1' },
      { text: 'SD6743 8083' },
      { text: 4.7575 },
      { text: '3 years' }
    ])

    // Second row corresponds to parcel SD6743 8333, CMOR1 action
    expect(data[1]).toEqual([
      { text: 'Assess moorland and produce a written record' },
      { text: 'CMOR1' },
      { text: 'SD6743 8333' },
      { text: 2.1705 },
      { text: '3 years' }
    ])
  })

  test('builds summaryOfPayments with correct headings, rows and totals using sampleAgreementData', () => {
    const agreementData = buildAgreementData()

    const model = buildReviewOfferModel(agreementData)
    const { headings, data } = model.summaryOfPayments

    // Headings should match expected static labels
    expect(headings).toEqual([
      { text: 'Action' },
      { text: 'Code' },
      { text: 'Annual payment rate' },
      { text: 'First payment' },
      { text: 'Subsequent payments' },
      { text: 'Annual payment value' }
    ])

    // There should be 4 rows: 2 parcel items + 1 agreement-level item + 1 totals row
    expect(data).toHaveLength(4)

    // Extract the totals row (last)
    const totalsRow = data[data.length - 1]
    expect(totalsRow).toEqual([
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '£0.60', attributes: { class: 'govuk-!-font-weight-bold' } },
      { text: '£1', attributes: { class: 'govuk-!-font-weight-bold' } },
      { text: '£345.44', attributes: { class: 'govuk-!-font-weight-bold' } }
    ])

    // The three data rows all have code CMOR1; locate them by unique cells
    const rows = data.slice(0, -1)

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

  test('summaryOfActions returns empty data when application parcels are missing', () => {
    const model = buildReviewOfferModel({
      agreementData: {
        payment: { parcelItems: {}, agreementLevelItems: {} },
        application: {}
      }
    })

    const { headings, data } = model.summaryOfActions

    expect(headings).toEqual([
      { text: 'Action' },
      { text: 'Code' },
      { text: 'Land parcel' },
      { text: 'Quantity (ha)' },
      { text: 'Duration' }
    ])
    expect(data).toEqual([])
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

    const model = buildReviewOfferModel(agreementData)

    const rows = model.summaryOfActions.data
    expect(rows).toHaveLength(3)

    // 1 -> "1 year"
    expect(rows[0][4]).toEqual({ text: '1 year' })
    // '2' (string) -> numeric coercion -> "2 years"
    expect(rows[1][4]).toEqual({ text: '2 years' })
    // undefined -> Number(undefined) || 0 -> 0 -> "0 years"
    expect(rows[2][4]).toEqual({ text: '0 years' })
  })

  // test('codeDescriptions strips code prefix from descriptions and merges sources', () => {
  //   const model = buildReviewOfferModel({
  //     payment: {
  //       parcelItems: {
  //         1: {
  //           code: 'UPL1',
  //           description: 'UPL1: Moderate livestock grazing on moorland',
  //           rateInPence: 1234,
  //           unit: 'ha',
  //           annualPaymentPence: 12345
  //         },
  //         2: {
  //           // no prefix to strip
  //           code: 'ABC1',
  //           description: 'Plain description',
  //           rateInPence: 2000,
  //           unit: 'ha',
  //           annualPaymentPence: 20000
  //         }
  //         // Note: omit any item without a code to avoid payments summary sorting errors
  //       },
  //       agreementLevelItems: {
  //         1: {
  //           // same code as parcel item; agreement-level should override
  //           code: 'UPL1',
  //           description: 'UPL1: Overriding description from agreement level',
  //           annualPaymentPence: 30000
  //         },
  //         2: {
  //           code: 'DEF2',
  //           description: 'DEF2: Agreement level item',
  //           annualPaymentPence: 10000
  //         }
  //       },
  //       payments: [
  //         { totalPaymentPence: 0, paymentDate: '2026-01-01', lineItems: [] },
  //         { totalPaymentPence: 0, paymentDate: '2026-04-01', lineItems: [] }
  //       ]
  //     }
  //   })
  //
  //   expect(model.codeDescriptions).toEqual({
  //     // UPL1 comes from agreementLevelItems and has its prefix removed
  //     UPL1: 'Overriding description from agreement level',
  //     // ABC1 remains as-is (no prefix present)
  //     ABC1: 'Plain description',
  //     // DEF2 has its prefix removed
  //     DEF2: 'Agreement level item'
  //   })
  // })

  // test('codeDescriptions handles empty or undefined descriptions safely', () => {
  //   const model = buildReviewOfferModel({
  //     payment: {
  //       parcelItems: {
  //         1: {
  //           code: 'NO_DESC',
  //           description: '',
  //           rateInPence: 1000,
  //           unit: 'ha',
  //           annualPaymentPence: 10000
  //         },
  //         2: {
  //           code: 'UNDEF_DESC',
  //           // description undefined
  //           rateInPence: 2000,
  //           unit: 'ha',
  //           annualPaymentPence: 20000
  //         }
  //       },
  //       agreementLevelItems: {},
  //       payments: [
  //         { totalPaymentPence: 0, paymentDate: '2026-01-01', lineItems: [] },
  //         { totalPaymentPence: 0, paymentDate: '2026-04-01', lineItems: [] }
  //       ]
  //     }
  //   })
  //
  //   expect(model.codeDescriptions).toEqual({
  //     NO_DESC: '',
  //     UNDEF_DESC: ''
  //   })
  // })

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

    const model = buildReviewOfferModel(agreementData)
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

  // test('calculateDurationInYears falls back to 1 when date parsing/diff fails', () => {
  //   const agreementData = buildAgreementData()
  //   // Supply invalid date strings so date-fns differenceInYears throws
  //   agreementData.payment.agreementStartDate = 'not-a-date'
  //   agreementData.payment.agreementEndDate = 'also-not-a-date'
  //
  //   const model = buildReviewOfferModel(agreementData)
  //
  //   // All payment rows should have duration 1 due to the catch fallback
  //   expect(model.payments.length).toBeGreaterThan(0)
  //   for (const row of model.payments) {
  //     expect(row.duration).toBe(1)
  //   }
  // })
})

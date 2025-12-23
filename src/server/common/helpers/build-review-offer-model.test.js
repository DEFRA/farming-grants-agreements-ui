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

vi.mock('./payment-calculations.js', () => ({
  calculateFirstPaymentForAgreementLevelItem: vi.fn(),
  calculateFirstPaymentForParcelItem: vi.fn(),
  calculateSubsequentPaymentForAgreementLevelItem: vi.fn(),
  calculateSubsequentPaymentForParcelItem: vi.fn(),
  calculateTotalFirstPayment: vi.fn(),
  calculateTotalSubsequentPayment: vi.fn()
}))

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
    expect(model.parcels).toBe(agreementData.application.parcel)
    expect(model.codeDescriptions).toEqual({
      CMOR1: 'Assess moorland and produce a written record'
    })

    // payments should contain 3 rows (2 parcel rows + 1 agreement level row)
    expect(model.payments).toHaveLength(3)
    const parcelRow = model.payments.find((row) => row.parcelId === '8083')
    expect(parcelRow).toMatchObject({
      code: 'CMOR1',
      description: 'Assess moorland and produce a written record',
      unit: 'ha',
      duration: 1,
      hasOneOffPayment: false,
      rateInPence: '£10.60',
      quarterlyPayment: 1260,
      firstPaymentPence: 10,
      subsequentPaymentPence: 20
    })

    const agreementLevelRow = model.payments.find(
      (row) => row.hasOneOffPayment === true
    )
    expect(agreementLevelRow).toMatchObject({
      code: 'CMOR1',
      description: 'Assess moorland and produce a written record',
      rateInPence: '£272',
      duration: 1,
      hasOneOffPayment: true,
      quarterlyPayment: 6800,
      firstPaymentPence: 30,
      subsequentPaymentPence: 40
    })

    expect(model.totalQuarterly).toBe(8635)
    expect(model.totalYearly).toBe(34544)
    expect(model.totalFirstPayment).toBe(123456)
    expect(model.totalSubsequentPayment).toBe(654321)

    expect(mockedTotalFirst).toHaveBeenCalledWith(model.payments)
    expect(mockedTotalSubsequent).toHaveBeenCalledWith(model.payments)
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

    expect(model.parcels).toEqual([])
    expect(model.codeDescriptions).toEqual({})
    expect(model.payments).toEqual([])
    expect(model.totalQuarterly).toBeUndefined()
    expect(model.totalYearly).toBe(0)
    expect(model.totalFirstPayment).toBe(0)
    expect(model.totalSubsequentPayment).toBe(0)

    expect(mockedFirstParcel).not.toHaveBeenCalled()
    expect(mockedSubsequentParcel).not.toHaveBeenCalled()
    expect(mockedFirstAgreement).not.toHaveBeenCalled()
    expect(mockedSubsequentAgreement).not.toHaveBeenCalled()
    expect(mockedTotalFirst).toHaveBeenCalledWith([])
    expect(mockedTotalSubsequent).toHaveBeenCalledWith([])
  })

  test('handles missing parcelItems by falling back to an empty object', () => {
    const model = buildReviewOfferModel({
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

    expect(model.payments).toEqual([])
    expect(mockedFirstParcel).not.toHaveBeenCalled()
    expect(mockedSubsequentParcel).not.toHaveBeenCalled()
  })
})

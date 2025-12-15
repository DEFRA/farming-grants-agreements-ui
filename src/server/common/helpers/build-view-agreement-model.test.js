import { vi } from 'vitest'

import { getAgreementCalculations } from './get-agreement-calculations.js'
import {
  buildAgreementViewModel,
  hasLeastOneGivenParcelCode
} from './build-view-agreement-model.js'

vi.mock('./get-agreement-calculations.js', () => ({
  getAgreementCalculations: vi.fn()
}))

describe('hasLeastOneGivenParcelCode', () => {
  const agreementData = {
    payment: {
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
          code: 'UPL3',
          description: 'Limited livestock grazing on moorland',
          durationYears: 3,
          version: 1,
          unit: 'ha',
          quantity: 4.7575,
          rateInPence: 6600,
          annualPaymentPence: 31400,
          sheetId: 'SD6743',
          parcelId: '8083'
        },
        3: {
          code: 'CMOR1',
          description: 'Assess moorland and produce a written record',
          durationYears: 1,
          version: 1,
          unit: 'ha',
          quantity: 2.1705,
          rateInPence: 1060,
          annualPaymentPence: 2301,
          sheetId: 'SD4842',
          parcelId: '4495'
        },
        4: {
          code: 'UPL1',
          description: 'Moderate livestock grazing on moorland',
          durationYears: 3,
          version: 1,
          unit: 'ha',
          quantity: 2.1705,
          rateInPence: 2000,
          annualPaymentPence: 4341,
          sheetId: 'SD4842',
          parcelId: '4495'
        }
      }
    }
  }

  test('returns true when parcel code exists', () => {
    expect(hasLeastOneGivenParcelCode(agreementData, 'CMOR1')).toBe(true)
  })

  test('returns false when parcel code is absent', () => {
    expect(hasLeastOneGivenParcelCode(agreementData, 'NON_EXISTENT')).toBe(
      false
    )
  })
})

describe('buildAgreementViewModel', () => {
  const mockedGetAgreementCalculations = vi.mocked(getAgreementCalculations)

  afterEach(() => {
    vi.clearAllMocks()
  })

  const baseAgreementData = {
    status: 'accepted',
    agreementName: 'Example agreement',
    applicant: {
      business: { name: 'Farm Business' },
      customer: {
        name: {
          title: 'Mr.',
          first: 'Edward',
          middle: 'Paul',
          last: 'Jones'
        }
      }
    },
    payment: {
      agreementStartDate: '2026-01-01',
      agreementEndDate: '2027-01-01'
    }
  }

  test('includes agreement calculations and retains applicant data for accepted agreements', () => {
    const calculations = {
      summaryOfActions: { headings: [], data: [] },
      summaryOfPayments: { headings: [], data: [] },
      agreementLand: { headings: [], data: [] },
      annualPaymentSchedule: { headings: [], data: [] }
    }
    mockedGetAgreementCalculations.mockReturnValue(calculations)

    const model = buildAgreementViewModel(baseAgreementData)

    expect(mockedGetAgreementCalculations).toHaveBeenCalledWith(
      baseAgreementData
    )
    expect(model).toEqual({
      agreementName: 'Farm Business FPTT',
      agreementStartDate: '1 January 2026',
      agreementEndDate: '1 January 2027',
      isDraftAgreement: false,
      isAgreementAccepted: true,
      isWithdrawnAgreement: false,
      isCMOR1ActionUsed: true,
      businessName: 'Farm Business',
      applicantName: 'Mr. Edward Paul Jones',
      ...calculations
    })
  })

  test('masks business and applicant names for offered status and defaults agreement name', () => {
    const calculations = {
      summaryOfActions: { headings: [{ text: 'A' }], data: [{}] }
    }
    mockedGetAgreementCalculations.mockReturnValue(calculations)

    const draftAgreement = {
      ...baseAgreementData,
      agreementName: undefined,
      status: 'offered',
      payment: {
        agreementStartDate: '2026-01-01',
        agreementEndDate: '2027-01-01',
        parcelItems: {
          1: {
            code: 'OTHER'
          }
        }
      }
    }

    const model = buildAgreementViewModel(draftAgreement)

    expect(model.agreementName).toBe('Farm Business FPTT')
    expect(model.isDraftAgreement).toBe(true)
    expect(model.isAgreementAccepted).toBe(false)
    expect(model.isWithdrawnAgreement).toBe(false)
    expect(model.isCMOR1ActionUsed).toBe(false)
    expect(model.businessName).toBe('XXXXX')
    expect(model.applicantName).toBe('XXXXX')
    expect(model.agreementStartDate).toBe('XXXXX')
    expect(model.agreementEndDate).toBe('XXXXX')
    expect(model.summaryOfActions).toBe(calculations.summaryOfActions)
  })

  test('masks business and applicant names for withdrawn status', () => {
    const calculations = {
      summaryOfActions: { headings: [{ text: 'A' }], data: [{}] }
    }
    mockedGetAgreementCalculations.mockReturnValue(calculations)

    const withdrawnAgreement = {
      ...baseAgreementData,
      status: 'withdrawn',
      payment: {
        agreementStartDate: '2026-01-01',
        agreementEndDate: '2027-01-01',
        parcelItems: {
          1: {
            code: 'CMOR1'
          }
        }
      }
    }

    const model = buildAgreementViewModel(withdrawnAgreement)

    expect(model.isDraftAgreement).toBe(false)
    expect(model.isAgreementAccepted).toBe(false)
    expect(model.isWithdrawnAgreement).toBe(true)
    expect(model.businessName).toBe('XXXXX')
    expect(model.applicantName).toBe('XXXXX')
    expect(model.agreementStartDate).toBe('XXXXX')
    expect(model.agreementEndDate).toBe('XXXXX')
    expect(model.isCMOR1ActionUsed).toBe(true)
  })
})

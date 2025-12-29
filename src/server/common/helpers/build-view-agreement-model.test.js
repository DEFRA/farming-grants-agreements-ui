import { vi } from 'vitest'

import { getAgreementCalculations } from './get-agreement-calculations.js'
import { buildAgreementViewModel } from './build-view-agreement-model.js'

vi.mock('./get-agreement-calculations.js', () => ({
  getAgreementCalculations: vi.fn()
}))

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
          middle: null,
          last: 'Jones'
        }
      }
    },
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

  test('includes agreement calculations and retains applicant data for accepted agreements', () => {
    const calculations = {
      summaryOfActions: { headings: [], data: [] },
      summaryOfPayments: { headings: [], data: [] },
      annualPaymentSchedule: { headings: [], data: [], annualPayments: [] }
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
      businessName: 'Farm Business',
      applicantName: 'Mr. Edward Jones',
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
  })
})

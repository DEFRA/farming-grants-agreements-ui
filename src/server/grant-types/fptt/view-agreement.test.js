import { vi } from 'vitest'

import { getAgreementCalculations } from '#~/server/common/helpers/get-agreement-calculations.js'
import { viewAgreement } from './view-agreement.js'

vi.mock('#~/server/common/helpers/get-agreement-calculations.js', () => ({
  getAgreementCalculations: vi.fn()
}))

describe('fptt viewAgreement', () => {
  const mockedGetAgreementCalculations = vi.mocked(getAgreementCalculations)

  afterEach(() => {
    vi.clearAllMocks()
  })

  const baseAgreementData = {
    status: 'accepted',
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

  test('exposes the FPTT view-agreement template path', () => {
    expect(viewAgreement.template).toBe('grant-types/fptt/view-agreement')
  })

  test('builds the accepted agreement view model', () => {
    const calculations = {
      summaryOfActions: { headings: [], data: [] },
      summaryOfPayments: { headings: [], data: [] },
      annualPaymentSchedule: { headings: [], data: [] }
    }
    mockedGetAgreementCalculations.mockReturnValue(calculations)

    expect(
      viewAgreement.buildModel({ agreementData: baseAgreementData })
    ).toEqual({
      pageTitle: 'Farm payments technical test agreement document',
      agreementName: 'Farm Business FPTT',
      agreementStartDate: '1 January 2026',
      agreementEndDate: '1 January 2027',
      isDraftAgreement: false,
      isAgreementAccepted: true,
      isWithdrawnAgreement: false,
      isCancelledAgreement: false,
      isTerminatedAgreement: false,
      businessName: 'Farm Business',
      applicantName: 'Mr. Edward Jones',
      ...calculations
    })
  })

  test('masks party details for offered agreements', () => {
    mockedGetAgreementCalculations.mockReturnValue({})

    const model = viewAgreement.buildModel({
      agreementData: {
        ...baseAgreementData,
        status: 'offered'
      }
    })

    expect(model.isDraftAgreement).toBe(true)
    expect(model.businessName).toBe('XXXXX')
    expect(model.applicantName).toBe('XXXXX')
    expect(model.agreementStartDate).toBe('XXXXX')
    expect(model.agreementEndDate).toBe('XXXXX')
  })
})

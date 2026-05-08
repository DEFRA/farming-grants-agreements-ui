import { describe, expect, test, vi } from 'vitest'
import { offerAccepted } from './offer-accepted.js'

const { mockedGetConsentDetails, mockedGetFirstPaymentDate } = vi.hoisted(
  () => ({
    mockedGetConsentDetails: vi.fn(() => ({
      consentHeading: 'Consent needed'
    })),
    mockedGetFirstPaymentDate: vi.fn(() => '5 December 2025')
  })
)

vi.mock('#~/server/common/helpers/get-consent-details.js', () => ({
  getConsentDetails: mockedGetConsentDetails
}))

vi.mock('#~/server/common/helpers/get-first-payment-date.js', () => ({
  getFirstPaymentDate: mockedGetFirstPaymentDate
}))

describe('fptt offerAccepted', () => {
  test('exposes the FPTT offer-accepted template path', () => {
    expect(offerAccepted.template).toBe(
      'grant-types/fptt/offer-accepted/offer-accepted'
    )
  })

  test('builds the view model with payment date and consent details', () => {
    const agreementData = {
      agreementNumber: 'FPTT123',
      payment: { agreementStartDate: '2025-09-01' },
      consentObjects: [{ source: 'Natural England' }]
    }

    expect(offerAccepted.buildModel({ agreementData })).toEqual({
      pageTitle: 'Offer accepted',
      panelTitle: 'Agreement offer accepted',
      agreement: agreementData,
      nearestQuarterlyPaymentDate: '5 December 2025',
      consentHeading: 'Consent needed'
    })
    expect(mockedGetFirstPaymentDate).toHaveBeenCalledWith('2025-09-01')
    expect(mockedGetConsentDetails).toHaveBeenCalledWith(
      agreementData.consentObjects
    )
  })
})

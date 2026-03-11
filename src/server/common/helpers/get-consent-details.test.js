import {
  getConsentDetails,
  HEFER_CONSENT_CODE,
  SSSI_CONSENT_CODE
} from './get-consent-details.js'

describe('getConsentDetails', () => {
  test('returns none when there are no consent objects', () => {
    expect(getConsentDetails()).toEqual({
      consentObjects: [],
      hasSssiConsent: false,
      hasHeferConsent: false,
      consentVariant: 'none',
      showConsentSection: false
    })
  })

  test('returns sssi details when only Natural England consent is present', () => {
    const consentObjects = [
      { code: SSSI_CONSENT_CODE },
      { code: SSSI_CONSENT_CODE }
    ]

    expect(getConsentDetails(consentObjects)).toEqual({
      consentObjects,
      hasSssiConsent: true,
      hasHeferConsent: false,
      consentVariant: 'sssi',
      showConsentSection: true
    })
  })

  test('returns hefer details when only Historic England consent is present', () => {
    const consentObjects = [{ code: HEFER_CONSENT_CODE }]

    expect(getConsentDetails(consentObjects)).toEqual({
      consentObjects,
      hasSssiConsent: false,
      hasHeferConsent: true,
      consentVariant: 'hefer',
      showConsentSection: true
    })
  })

  test('returns both details when both consent types are present', () => {
    const consentObjects = [
      { code: HEFER_CONSENT_CODE },
      { code: SSSI_CONSENT_CODE },
      { code: 'ignored' }
    ]

    expect(getConsentDetails(consentObjects)).toEqual({
      consentObjects,
      hasSssiConsent: true,
      hasHeferConsent: true,
      consentVariant: 'both',
      showConsentSection: true
    })
  })
})

const SSSI_CONSENT_CODE = 'ne-consent-required'
const HEFER_CONSENT_CODE = 'hefer-consent-required'

export const getConsentDetails = (consentObjects = []) => {
  const consentList = Array.isArray(consentObjects) ? consentObjects : []
  const consentCodes = new Set(
    consentList.map((consentObject) => consentObject?.code).filter(Boolean)
  )

  const hasSssiConsent = consentCodes.has(SSSI_CONSENT_CODE)
  const hasHeferConsent = consentCodes.has(HEFER_CONSENT_CODE)

  let consentVariant
  if (hasSssiConsent && hasHeferConsent) {
    consentVariant = 'both'
  } else if (hasSssiConsent) {
    consentVariant = 'sssi'
  } else if (hasHeferConsent) {
    consentVariant = 'hefer'
  } else {
    consentVariant = 'none'
  }

  return {
    consentObjects: consentList,
    hasSssiConsent,
    hasHeferConsent,
    consentVariant,
    showConsentSection: consentVariant !== 'none'
  }
}

export { SSSI_CONSENT_CODE, HEFER_CONSENT_CODE }

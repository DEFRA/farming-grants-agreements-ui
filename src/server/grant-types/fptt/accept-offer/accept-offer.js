import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'

export const acceptOffer = {
  template: 'grant-types/fptt/accept-offer/accept-offer',
  validate(request, agreementData) {
    if (request.payload?.confirm !== 'confirmed') {
      auditEvent(
        request,
        AuditEvent.ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED,
        agreementData
      )
      return {
        isValid: false,
        errorMessage: 'Please agree with the Terms and Conditions'
      }
    }
    return { isValid: true }
  },
  buildModel: ({ errorMessage } = {}) => ({
    pageTitle: 'Accept your agreement offer',
    errorMessage
  })
}

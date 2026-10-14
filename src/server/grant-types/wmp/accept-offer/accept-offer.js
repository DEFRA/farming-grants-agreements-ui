import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'
import { WMP_TERMS_URL } from '../constants.js'

export const acceptOffer = {
  template: 'grant-types/wmp/accept-offer/accept-offer',
  validate(request, agreementData) {
    if (request.payload?.confirm !== 'confirmed') {
      auditEvent(
        request,
        AuditEvent.ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED,
        agreementData
      )
      return {
        isValid: false,
        errorMessage:
          'Select the checkbox to confirm you accept this agreement offer'
      }
    }
    return { isValid: true }
  },
  buildModel: ({ errorMessage } = {}) => ({
    pageTitle: 'Accept your agreement offer',
    termsHref: WMP_TERMS_URL,
    errorMessage
  })
}

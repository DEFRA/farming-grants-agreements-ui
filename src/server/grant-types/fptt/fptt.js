import { getConsentDetails } from '#~/server/common/helpers/get-consent-details.js'
import { getFirstPaymentDate } from '#~/server/common/helpers/get-first-payment-date.js'
import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'

export const fptt = {
  acceptOffer: {
    template: 'grant-types/fptt/templates/accept-offer',
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
  },
  offerAccepted: {
    template: 'grant-types/fptt/templates/offer-accepted',
    buildModel: ({ agreementData }) => ({
      pageTitle: 'Offer accepted',
      panelTitle: 'Agreement offer accepted',
      agreement: agreementData,
      nearestQuarterlyPaymentDate: getFirstPaymentDate(
        agreementData.payment.agreementStartDate
      ),
      ...getConsentDetails(agreementData?.consentObjects)
    })
  }
}

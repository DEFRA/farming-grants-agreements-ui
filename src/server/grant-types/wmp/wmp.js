import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'

const WMP_TERMS_URL =
  'https://www.gov.uk/government/publications/capital-grants-agreements-terms-and-conditions-2026'

export const wmp = {
  acceptOffer: {
    template: 'grant-types/wmp/templates/accept-offer',
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
  },
  offerAccepted: {
    template: 'grant-types/wmp/templates/offer-accepted',
    buildModel: ({ agreementData }) => ({
      pageTitle: 'Offer accepted',
      panelTitle: 'Agreement offer accepted',
      agreement: agreementData,
      termsHref: WMP_TERMS_URL
    })
  }
}

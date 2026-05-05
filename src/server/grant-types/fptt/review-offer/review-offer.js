// import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'
import { buildReviewOfferModel } from '#~/server/common/helpers/build-review-offer-model.js'

export const reviewOffer = {
  template: 'grant-types/fptt/review-offer/review-offer',
  // validate(request, agreementData) {
  //   if (request.payload?.confirm !== 'confirmed') {
  //     auditEvent(
  //       request,
  //       AuditEvent.ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED,
  //       agreementData
  //     )
  //     return {
  //       isValid: false,
  //       errorMessage: 'Please agree with the Terms and Conditions'
  //     }
  //   }
  //   return { isValid: true }
  // },
  buildModel: ({ agreementData }) => buildReviewOfferModel(agreementData)
}

import { buildReviewOfferModel } from '#~/server/common/helpers/build-review-offer-model.js'
import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'

export const reviewOfferController = {
  async handler(request, h) {
    const source = request?.pre?.data ?? {}
    const agreementData = source.agreementData || {}

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, agreementData)

    return h.view('review-offer/index', {
      pageTitle: 'Review your agreement offer',
      ...buildReviewOfferModel(agreementData)
    })
  }
}

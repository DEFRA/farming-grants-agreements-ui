import {
  buildReviewOfferModel
} from '#~/server/common/helpers/build-review-offer-model.js'
import {
  buildWMPReviewOfferModel
} from '#~/server/common/helpers/build-wmp-review-offer-model.js'
import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'

export const reviewOfferController = {
  async handler(request, h) {
    const source = request?.pre?.data ?? {}
    const agreementData = source.agreementData || {}

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, agreementData)

    const isWoodland = agreementData.code === 'woodland'
    const viewType = isWoodland ? 'woodland' : 'standard'

    const buildModel = isWoodland
      ? buildWMPReviewOfferModel
      : buildReviewOfferModel

    return h.view('review-offer/index', {
      pageTitle: 'Review your agreement offer',
      viewType,
      ...buildModel(agreementData)
    })
  }
}

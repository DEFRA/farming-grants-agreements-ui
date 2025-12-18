import { buildReviewOfferModel } from '../common/helpers/build-review-offer-model.js'

export const reviewOfferController = {
  async handler(request, h) {
    const source = request?.pre?.data ?? {}
    const agreementData = source.agreementData || {}

    return h.view('review-offer/index', {
      pageTitle: 'Review your agreement offer',
      ...buildReviewOfferModel(agreementData)
    })
  }
}

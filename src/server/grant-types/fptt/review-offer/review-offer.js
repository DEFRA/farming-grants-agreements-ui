import { buildReviewOfferModel } from '#~/server/common/helpers/build-review-offer-model.js'

export const reviewOffer = {
  template: 'grant-types/fptt/review-offer/review-offer',
  buildModel: ({ agreementData }) => buildReviewOfferModel(agreementData)
}

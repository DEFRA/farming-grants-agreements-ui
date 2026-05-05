import { buildWMPReviewOfferModel } from '#~/server/common/helpers/build-wmp-review-offer-model.js'

export const reviewOffer = {
  template: 'grant-types/wmp/review-offer/review-offer',
  buildModel: ({ agreementData }) => buildWMPReviewOfferModel(agreementData)
}

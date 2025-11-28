import Boom from '@hapi/boom'

import { reviewOfferController } from '../../review-offer/controller.js'
import {
  acceptOfferController,
  validateAcceptOfferController
} from '../../accept-offer/controller.js'
import { offerAcceptedController } from '../../offer-accepted/controller.js'
import { offerWithdrawnController } from '../../offer-withdrawn/controller.js'

export const getControllerByAction = (agreementStatus) => {
  let chooseControllerByActionOffer
  if (agreementStatus === 'offered') {
    chooseControllerByActionOffer = (action) => {
      switch (action) {
        case 'validate-accept-offer':
          return validateAcceptOfferController
        case 'display-accept':
        case 'accept-offer':
          return acceptOfferController
        case 'review-offer':
        default:
          return reviewOfferController
      }
    }
  } else if (agreementStatus === 'accepted') {
    chooseControllerByActionOffer = () => offerAcceptedController
  } else if (agreementStatus === 'withdrawn') {
    chooseControllerByActionOffer = () => offerWithdrawnController
  } else {
    throw Boom.badRequest(`Agreement is in an unknown state`)
  }

  return chooseControllerByActionOffer
}

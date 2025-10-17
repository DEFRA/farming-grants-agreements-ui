import Boom from '@hapi/boom'

import { reviewOfferController } from '../../review-offer/controller.js'
import { acceptOfferController } from '../../accept-offer/controller.js'
import { viewAgreementController } from '../../view-agreement/controller.js'
import { offerAcceptedController } from '../../offer-accepted/controller.js'
import { offerWithdrawnController } from '../../offer-withdrawn/controller.js'

export const getControllerByAction = (agreementStatus) => {
  let chooseControllerByActionOffer
  if (agreementStatus === 'offered') {
    chooseControllerByActionOffer = (action) => {
      switch (action) {
        case 'display-accept':
        case 'accept-offer':
          return acceptOfferController
        case 'review-offer':
        default:
          return reviewOfferController
      }
    }
  } else if (agreementStatus === 'accepted') {
    chooseControllerByActionOffer = (action) => {
      switch (action) {
        case 'view-agreement':
          return viewAgreementController
        case 'accept-offer':
        case 'offer-accepted':
        default:
          return offerAcceptedController
      }
    }
  } else if (agreementStatus === 'withdrawn') {
    chooseControllerByActionOffer = () => offerWithdrawnController
  } else {
    throw Boom.badRequest(`Agreement is in an unknown state`)
  }

  return chooseControllerByActionOffer
}

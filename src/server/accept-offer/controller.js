import path from 'node:path'

import Boom from '@hapi/boom'

import { getBaseUrl } from '../common/helpers/base-url.js'

export const acceptOfferController = {
  async handler(request, h) {
    const action = request?.payload?.action
    const confirm = request?.payload?.confirm
    const { agreementId = '' } = request.params
    const { agreementData } = request.pre?.data || {}

    if (action === 'accept-offer' && agreementData.status === 'offered') {
      // Validate that the checkbox has been checked
      if (confirm !== 'confirmed') {
        throw Boom.badRequest('Please agree with the Terms and Conditions')
      }

      return h.redirect(path.join(getBaseUrl(request), agreementId))
    }

    return h.view('accept-offer/index', {
      pageTitle: 'Accept your agreement offer'
    })
  }
}

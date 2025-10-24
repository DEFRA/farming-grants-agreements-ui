import path from 'node:path'

import { getBaseUrl } from '../common/helpers/base-url.js'

export const acceptOfferController = {
  async handler(request, h) {
    const action = request?.payload?.action
    const { agreementId } = request.params
    const { agreementData } = request.pre?.data || {}

    if (action === 'accept-offer' && agreementData.status === 'offered') {
      return h.redirect(path.join(getBaseUrl(request), agreementId))
    }

    return h.view('accept-offer/index', {
      pageTitle: 'Accept your offer'
    })
  }
}

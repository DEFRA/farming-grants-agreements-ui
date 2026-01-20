import { apiRequest } from '../common/helpers/api.js'
import { getBaseUrl } from '../common/helpers/base-url.js'
import path from 'node:path'

export const validateAcceptOfferController = {
  async handler(request, h) {
    const confirm = request?.payload?.confirm
    const { agreementId = '' } = request.params

    // Validate that the checkbox has been checked
    if (confirm !== 'confirmed') {
      return h.view('accept-offer/index', {
        pageTitle: 'Accept your agreement offer',
        errorMessage: {
          text: 'Please agree with the Terms and Conditions'
        }
      })
    }

    // Checkbox confirmed - now submit the accept-offer action to the API
    await apiRequest({
      agreementId,
      method: 'POST',
      auth:
        request.headers['x-encrypted-auth'] ||
        request.query['x-encrypted-auth'],
      body: { action: 'accept-offer' }
    })

    // Redirect to the offer accepted page
    return h.redirect(getBaseUrl(request))
  }
}

export const acceptOfferController = {
  async handler(request, h) {
    const action = request?.payload?.action
    const { agreementId = '' } = request.params
    const { agreementData } = request.pre?.data || {}

    if (action === 'accept-offer' && agreementData.status === 'offered') {
      return h.redirect(path.join(getBaseUrl(request), agreementId))
    }

    return h.view('accept-offer/index', {
      pageTitle: 'Accept your agreement offer'
    })
  }
}

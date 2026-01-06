import { apiRequest } from '../common/helpers/api.js'
import { getFirstPaymentDate } from '../common/helpers/get-first-payment-date.js'
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
    const { agreementData } = await apiRequest({
      agreementId,
      method: 'POST',
      auth:
        request.headers['x-encrypted-auth'] ||
        request.query['x-encrypted-auth'],
      body: { action: 'accept-offer' }
    })

    // Show the offer-accepted page
    return h.view('offer-accepted/index', {
      pageTitle: 'Offer accepted',
      panelTitle: 'Agreement offer accepted',
      baseUrl: getBaseUrl(request),
      agreement: agreementData,
      nearestQuarterlyPaymentDate: getFirstPaymentDate(
        agreementData.payment.agreementStartDate
      )
    })
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

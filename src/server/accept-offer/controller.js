import { apiRequest } from '../common/helpers/api.js'
import { getFirstPaymentDate } from '../common/helpers/get-first-payment-date.js'
import { getBaseUrl } from '../common/helpers/base-url.js'

export const acceptOfferController = {
  async handler(request, h) {
    const action = request?.payload?.action
    const confirm = request?.payload?.confirm
    const { agreementId = '' } = request.params

    // Handle validate-accept-offer action - validate checkbox before status changes
    if (action === 'validate-accept-offer') {
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
        auth: request.headers['x-encrypted-auth'],
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

    return h.view('accept-offer/index', {
      pageTitle: 'Accept your agreement offer'
    })
  }
}

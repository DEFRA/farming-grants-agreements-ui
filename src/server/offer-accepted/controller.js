import { getFirstPaymentDate } from '#~/server/common/helpers/get-first-payment-date.js'
import { getConsentDetails } from '#~/server/common/helpers/get-consent-details.js'

export const offerAcceptedController = {
  async handler(request, h) {
    const { agreementData } = request.pre?.data || {}

    return h.view('offer-accepted/index', {
      pageTitle: 'Offer accepted',
      panelTitle: 'Agreement offer accepted',
      nearestQuarterlyPaymentDate: getFirstPaymentDate(
        agreementData.payment.agreementStartDate
      ),
      ...getConsentDetails(agreementData?.consentObjects)
    })
  }
}

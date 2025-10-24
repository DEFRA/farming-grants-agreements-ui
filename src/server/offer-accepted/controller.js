import { getFirstPaymentDate } from '../common/helpers/get-first-payment-date.js'

export const offerAcceptedController = {
  async handler(request, h) {
    const { agreementData } = request.pre?.data || {}

    return h.view('offer-accepted/index', {
      pageTitle: 'Offer accepted',
      nearestQuarterlyPaymentDate: getFirstPaymentDate(
        agreementData.payment.agreementStartDate
      )
    })
  }
}

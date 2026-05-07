import { getConsentDetails } from '#~/server/common/helpers/get-consent-details.js'
import { getFirstPaymentDate } from '#~/server/common/helpers/get-first-payment-date.js'

export const offerAccepted = {
  template: 'grant-types/fptt/offer-accepted',
  buildModel: ({ agreementData }) => ({
    pageTitle: 'Offer accepted',
    panelTitle: 'Agreement offer accepted',
    agreement: agreementData,
    nearestQuarterlyPaymentDate: getFirstPaymentDate(
      agreementData.payment.agreementStartDate
    ),
    ...getConsentDetails(agreementData?.consentObjects)
  })
}

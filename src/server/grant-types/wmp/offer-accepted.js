import { WMP_TERMS_URL } from './constants.js'

export const offerAccepted = {
  template: 'grant-types/wmp/offer-accepted',
  buildModel: ({ agreementData }) => ({
    pageTitle: 'Offer accepted',
    panelTitle: 'Agreement offer accepted',
    agreement: agreementData,
    termsHref: WMP_TERMS_URL
  })
}

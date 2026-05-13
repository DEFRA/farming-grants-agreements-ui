import { formatPenceCurrency } from '#~/config/nunjucks/filters/format-currency.js'

const buildPaymentActionDetails = (payment) => {
  return Object.values(payment?.agreementLevelItems || {}).map((item) => ({
    code: item.code,
    description: item.description,
    annualPaymentPence: item.annualPaymentPence
  }))
}

const getSummaryOfWMPActions = (agreementData) => {
  const payment = agreementData?.payment || {}
  const actionDetails = buildPaymentActionDetails(payment)

  const headings = [
    { text: 'Action' },
    { text: 'Code' },
    { text: 'Grant payment amount' }
  ]

  const data = actionDetails.map((item) => [
    { text: item.description },
    { text: item.code },
    { text: formatPenceCurrency(item.annualPaymentPence) }
  ])

  return { summaryOfActions: { headings, data } }
}

const buildWMPReviewOfferModel = (agreementData) => {
  const root = agreementData?.agreementData ?? agreementData
  return {
    pageTitle: 'Review your agreement offer',
    ...getSummaryOfWMPActions(root)
  }
}

export const reviewOffer = {
  template: 'grant-types/wmp/review-offer/review-offer',
  buildModel: ({ agreementData }) => buildWMPReviewOfferModel(agreementData)
}

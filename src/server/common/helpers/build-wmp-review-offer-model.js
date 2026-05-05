const buildPaymentActionDetails = (payment) => {
  return Object.values(payment?.agreementLevelItems || {}).map((item) => ({
    code: item.code,
    description: item.description
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
    { text: 'XXX' }
  ])

  return { summaryOfActions: { headings, data } }
}

export const buildWMPReviewOfferModel = (agreementData) => {
  const root = agreementData?.agreementData ?? agreementData
  return {
    pageTitle: 'Review your agreement offer',
    ...getSummaryOfWMPActions(root)
  }
}

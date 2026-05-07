
const getSummaryOfWMPActions = (agreementData) => {
  const headings = [
    { text: 'Action' },
    { text: 'Code' },
    { text: 'Grant payment amount' }
  ]

  const data = [
    [
      {
        text: 'To produce a Woodland Management Plan for a sustainable Forest Management in accordance with the UK Forestry Standard'
      },
      { text: 'PA3' },
      { text: 'XXX' }
    ]
  ]

  return { summaryOfActions: { headings, data } }
}

export const buildWMPReviewOfferModel = (agreementData) => {
  return {
    pageTitle: 'Review your agreement offer',
    ...getSummaryOfWMPActions(agreementData)
  }
}

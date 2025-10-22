/**
 * Get the first payment date for a given agreement start date
 * The first quarterly payment date is always 3 calendar months + 5 days after the agreement start date
 * @param {string} agreementStartDate - The date to get the next quarterly date for
 * @returns {string} The next quarterly date in 'Month Year' format
 */
export const getFirstPaymentDate = (agreementStartDate) => {
  const THREE_MONTHS = 3
  const FIVE_DAYS = 5

  const nextPaymentDate = new Date(agreementStartDate)
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + THREE_MONTHS)
  nextPaymentDate.setDate(nextPaymentDate.getDate() + FIVE_DAYS)

  const nextPaymentString = nextPaymentDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  })
  return nextPaymentString === 'Invalid Date' ? '' : nextPaymentString
}

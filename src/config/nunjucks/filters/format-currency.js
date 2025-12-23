export function formatCurrency(value, locale = 'en-GB', currency = 'GBP') {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  })

  return formatter.format(value)
}

export const formatPenceCurrency = (
  value,
  locales = 'en-GB',
  currency = 'GBP'
) => {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'number') {
    const formatted = (value / 100).toLocaleString(locales, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    // GDS style: remove .00 decimals unless pence are included
    // e.g., £75.50 but not £75.00 -> £75
    // Check if the value is a whole number (no pence)
    const isWholeNumber = value % 100 === 0
    if (isWholeNumber && formatted.includes('.00')) {
      return formatted.replace(/\.00$/, '')
    }
    return formatted
  }
  return value.toString().replace(/[^0-9.-]+/g, '')
}

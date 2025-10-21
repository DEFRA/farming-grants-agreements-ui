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
    return (value / 100).toLocaleString(locales, {
      style: 'currency',
      currency
    })
  }
  return value.toString().replace(/[^0-9.-]+/g, '')
}

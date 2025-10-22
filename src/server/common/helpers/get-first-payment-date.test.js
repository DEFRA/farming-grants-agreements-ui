import { getFirstPaymentDate } from './get-first-payment-date.js'

describe('getFirstPaymentDate', () => {
  test('returns correct first payment date', () => {
    expect(getFirstPaymentDate('2024-02-15')).toBe('May 2024')
    expect(getFirstPaymentDate('2024-02-31')).toBe('June 2024')
    expect(getFirstPaymentDate('2024-12-26')).toBe('March 2025')
    expect(getFirstPaymentDate('2024-12-27')).toBe('April 2025')
  })

  test('handles invalid date string gracefully', () => {
    expect(getFirstPaymentDate('invalid-date')).toBe('')
  })
})

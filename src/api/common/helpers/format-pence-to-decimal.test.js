import { describe, expect, it } from 'vitest'

import { formatPenceToDecimal } from './format-pence-to-decimal.js'

describe('formatPenceToDecimal', () => {
  it('formats pence as a 2dp decimal string', () => {
    expect(formatPenceToDecimal(1086)).toBe('10.86')
    expect(formatPenceToDecimal(0)).toBe('0.00')
    expect(formatPenceToDecimal(5)).toBe('0.05')
  })

  it('supports the maximum allowed value', () => {
    expect(formatPenceToDecimal(99999999999999)).toBe('999999999999.99')
  })

  it('throws for non-integer or non-finite input', () => {
    expect(() => formatPenceToDecimal(10.5)).toThrow(TypeError)
    expect(() => formatPenceToDecimal(Number.NaN)).toThrow(TypeError)
    expect(() => formatPenceToDecimal(Number.POSITIVE_INFINITY)).toThrow(
      TypeError
    )
  })

  it('throws for negative or out-of-range values', () => {
    expect(() => formatPenceToDecimal(-1)).toThrow(RangeError)
    expect(() => formatPenceToDecimal(100000000000000)).toThrow(RangeError)
  })
})

/**
 * Convert a pence integer into a decimal currency string (e.g., 1086 -> "10.86").
 * @param {number} pence Amount in minor units.
 * @returns {string} Decimal string with 2 fractional digits.
 */
export function formatPenceToDecimal(pence) {
  if (!Number.isFinite(pence) || !Number.isInteger(pence)) {
    throw new TypeError('Pence value must be a finite integer')
  }

  const maxPence = 99999999999999
  if (pence < 0 || pence > maxPence) {
    throw new RangeError('Pence value is out of supported range')
  }

  return (pence / 100).toFixed(2)
}

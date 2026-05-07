import { describe, expect, test } from 'vitest'
import { getGrantTypeFor } from './index.js'

describe('#getGrantTypeFor', () => {
  test('returns the FPTT grant type for frps-private-beta agreements', () => {
    const grantType = getGrantTypeFor({ code: 'frps-private-beta' })

    expect(grantType.acceptOffer.template).toBe(
      'grant-types/fptt/accept-offer/accept-offer'
    )
    expect(grantType.offerAccepted.template).toBe(
      'grant-types/fptt/offer-accepted/offer-accepted'
    )
    expect(grantType.viewAgreement.template).toBe(
      'grant-types/fptt/view-agreement'
    )
  })

  test('returns the WMP grant type for woodland agreements', () => {
    const grantType = getGrantTypeFor({ code: 'woodland' })

    expect(grantType.acceptOffer.template).toBe(
      'grant-types/wmp/accept-offer/accept-offer'
    )
    expect(grantType.offerAccepted.template).toBe(
      'grant-types/wmp/offer-accepted/offer-accepted'
    )
    expect(grantType.viewAgreement.template).toBe(
      'grant-types/wmp/view-agreement'
    )
  })

  test('throws a bad request for unknown agreement codes', () => {
    expect(() => getGrantTypeFor({ code: 'unknown' })).toThrow(
      'Unsupported agreement code: unknown'
    )
  })
})

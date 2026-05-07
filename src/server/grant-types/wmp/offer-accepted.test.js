import { describe, expect, test } from 'vitest'

import { offerAccepted } from './offer-accepted.js'

describe('wmp offerAccepted', () => {
  test('exposes the WMP offer-accepted template path', () => {
    expect(offerAccepted.template).toBe('grant-types/wmp/offer-accepted')
  })

  test('builds the view model with the agreement and WMP terms link', () => {
    const agreementData = {
      agreementNumber: 'WMP123'
    }

    expect(offerAccepted.buildModel({ agreementData })).toEqual({
      pageTitle: 'Offer accepted',
      panelTitle: 'Agreement offer accepted',
      agreement: agreementData,
      termsHref:
        'https://www.gov.uk/government/publications/capital-grants-agreements-terms-and-conditions-2026'
    })
  })
})

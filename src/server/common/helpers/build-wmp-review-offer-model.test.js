import { describe, it, expect } from 'vitest'
import { buildWMPReviewOfferModel } from './build-wmp-review-offer-model.js'

describe('buildWMPReviewOfferModel', () => {
  it('returns the correct model structure with hardcoded values', () => {
    const agreementData = { some: 'data' }
    const result = buildWMPReviewOfferModel(agreementData)

    expect(result).toEqual({
      pageTitle: 'Review your agreement offer',
      summaryOfActions: {
        headings: [
          { text: 'Action' },
          { text: 'Code' },
          { text: 'Grant payment amount' }
        ],
        data: [
          [
            {
              text: 'To produce a Woodland Management Plan for a sustainable Forest Management in accordance with the UK Forestry Standard'
            },
            { text: 'PA3' },
            { text: 'XXX' }
          ]
        ]
      }
    })
  })

  it('ignores agreementData as it is currently not used', () => {
    const result1 = buildWMPReviewOfferModel({})
    const result2 = buildWMPReviewOfferModel({ different: 'data' })

    expect(result1).toEqual(result2)
  })
})

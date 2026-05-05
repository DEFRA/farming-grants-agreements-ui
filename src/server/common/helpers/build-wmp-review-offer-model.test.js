import { describe, it, expect } from 'vitest'
import { buildWMPReviewOfferModel } from './build-wmp-review-offer-model.js'

describe('buildWMPReviewOfferModel', () => {
  it('should build the WMP review offer model with summary of actions', () => {
    const agreementData = {
      payment: {
        agreementStartDate: '2026-05-08',
        agreementEndDate: '2027-05-08',
        frequency: 'OneOff',
        agreementTotalPence: 157500,
        annualTotalPence: 157500,
        parcelItems: {},
        agreementLevelItems: {
          1: {
            code: 'WMP1',
            description: 'Produce a woodland management plan',
            version: '1',
            annualPaymentPence: 157500,
            _id: '69fdebc95c8d88a1bfc215ce'
          }
        }
      }
    }

    const result = buildWMPReviewOfferModel(agreementData)

    expect(result.pageTitle).toBe('Review your agreement offer')
    expect(result.summaryOfActions).toBeDefined()
    expect(result.summaryOfActions.data).toHaveLength(1)
    expect(result.summaryOfActions.data[0][0].text).toBe(
      'Produce a woodland management plan'
    )
    expect(result.summaryOfActions.data[0][1].text).toBe('WMP1')
  })

  it('should handle wrapped agreementData', () => {
    const agreementData = {
      agreementData: {
        payment: {
          agreementLevelItems: {
            1: {
              code: 'WMP1',
              description: 'Produce a woodland management plan'
            }
          }
        }
      }
    }

    const result = buildWMPReviewOfferModel(agreementData)

    expect(result.summaryOfActions.data[0][1].text).toBe('WMP1')
  })
})

import { describe, test, expect } from 'vitest'

import { getControllerByAction } from './get-controller-by-action.js'

import { reviewOfferController } from '../../review-offer/controller.js'
import { acceptOfferController } from '../../accept-offer/controller.js'
import { viewAgreementController } from '../../view-agreement/controller.js'
import { offerAcceptedController } from '../../offer-accepted/controller.js'
import { offerWithdrawnController } from '../../offer-withdrawn/controller.js'

describe('#getControllerByAction', () => {
  test("when status is 'offered' returns acceptOfferController for display-accept and accept-offer, otherwise reviewOfferController", () => {
    const chooser = getControllerByAction('offered')

    expect(chooser('display-accept')).toBe(acceptOfferController)
    expect(chooser('accept-offer')).toBe(acceptOfferController)

    expect(chooser('review-offer')).toBe(reviewOfferController)
    expect(chooser('some-other-action')).toBe(reviewOfferController)
    expect(chooser()).toBe(reviewOfferController)
  })

  test("when status is 'accepted' returns viewAgreementController for view-agreement and offerAcceptedController for other actions/default", () => {
    const chooser = getControllerByAction('accepted')

    expect(chooser('view-agreement')).toBe(viewAgreementController)

    expect(chooser('accept-offer')).toBe(offerAcceptedController)
    expect(chooser('offer-accepted')).toBe(offerAcceptedController)
    expect(chooser('some-other-action')).toBe(offerAcceptedController)
    expect(chooser()).toBe(offerAcceptedController)
  })

  test("when status is 'withdrawn' always returns offerWithdrawnController", () => {
    const chooser = getControllerByAction('withdrawn')

    expect(chooser()).toBe(offerWithdrawnController)
    expect(chooser('any-action')).toBe(offerWithdrawnController)
  })

  test('throws a bad request for unknown agreement status', () => {
    expect(() => getControllerByAction('invalid-status')).toThrow(
      'Agreement is in an unknown state'
    )
  })
})

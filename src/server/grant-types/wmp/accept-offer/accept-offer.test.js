import { beforeEach, describe, expect, test, vi } from 'vitest'
import { acceptOffer } from './accept-offer.js'

const { mockedAuditEvent } = vi.hoisted(() => ({
  mockedAuditEvent: vi.fn()
}))

vi.mock('#~/server/common/helpers/audit-event.js', () => ({
  auditEvent: mockedAuditEvent,
  AuditEvent: {
    ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED:
      'ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED'
  }
}))

describe('wmp acceptOffer', () => {
  beforeEach(() => {
    mockedAuditEvent.mockReset()
  })

  test('exposes the WMP accept-offer template path', () => {
    expect(acceptOffer.template).toBe(
      'grant-types/wmp/accept-offer/accept-offer'
    )
  })

  test('returns valid when the confirmation is present', () => {
    const request = { payload: { confirm: 'confirmed' } }
    const agreementData = { code: 'woodland' }

    expect(acceptOffer.validate(request, agreementData)).toEqual({
      isValid: true
    })
    expect(mockedAuditEvent).not.toHaveBeenCalled()
  })

  test('returns an error and audits when the confirmation is missing', () => {
    const request = { payload: {} }
    const agreementData = { code: 'woodland' }

    expect(acceptOffer.validate(request, agreementData)).toEqual({
      isValid: false,
      errorMessage:
        'Select the checkbox to confirm you accept this agreement offer'
    })
    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED',
      agreementData
    )
  })

  test('builds the view model with terms link and optional error', () => {
    expect(
      acceptOffer.buildModel({ errorMessage: 'Select the checkbox' })
    ).toEqual({
      pageTitle: 'Accept your agreement offer',
      termsHref:
        'https://www.gov.uk/government/publications/capital-grants-agreements-terms-and-conditions-2026',
      errorMessage: 'Select the checkbox'
    })
  })
})

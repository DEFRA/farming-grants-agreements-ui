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

describe('fptt acceptOffer', () => {
  beforeEach(() => {
    mockedAuditEvent.mockReset()
  })

  test('exposes the FPTT accept-offer template path', () => {
    expect(acceptOffer.template).toBe(
      'grant-types/fptt/accept-offer/accept-offer'
    )
  })

  test('returns valid when the confirmation is present', () => {
    const request = { payload: { confirm: 'confirmed' } }
    const agreementData = { code: 'frps-private-beta' }

    expect(acceptOffer.validate(request, agreementData)).toEqual({
      isValid: true
    })
    expect(mockedAuditEvent).not.toHaveBeenCalled()
  })

  test('returns an error and audits when the confirmation is missing', () => {
    const request = { payload: {} }
    const agreementData = { code: 'frps-private-beta' }

    expect(acceptOffer.validate(request, agreementData)).toEqual({
      isValid: false,
      errorMessage: 'Please agree with the Terms and Conditions'
    })
    expect(mockedAuditEvent).toHaveBeenCalledWith(
      request,
      'ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED',
      agreementData
    )
  })

  test('builds the view model with optional error', () => {
    expect(
      acceptOffer.buildModel({ errorMessage: 'Please agree first' })
    ).toEqual({
      pageTitle: 'Accept your agreement offer',
      errorMessage: 'Please agree first'
    })
  })
})

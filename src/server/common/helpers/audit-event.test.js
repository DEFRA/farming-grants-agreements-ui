import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

describe('AuditEvent', () => {
  let AuditEvent

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('@defra/cdp-auditing', () => ({ audit: vi.fn() }))
    ;({ AuditEvent } = await import('./audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('is frozen', () => {
    expect(Object.isFrozen(AuditEvent)).toBe(true)
  })

  test('contains expected event keys', () => {
    expect(AuditEvent.REVIEW_OFFER_VIEWED).toBe('REVIEW_OFFER_VIEWED')
    expect(AuditEvent.REVIEW_OFFER_CONTINUED).toBe('REVIEW_OFFER_CONTINUED')
    expect(AuditEvent.ACCEPT_OFFER_DECLARATION_CONFIRMED).toBe(
      'ACCEPT_OFFER_DECLARATION_CONFIRMED'
    )
    expect(AuditEvent.ACCEPT_OFFER_SUBMITTED).toBe('ACCEPT_OFFER_SUBMITTED')
  })

  test('cannot be mutated', () => {
    expect(() => {
      AuditEvent.NEW_KEY = 'value'
    }).toThrow(TypeError)
    expect(AuditEvent.NEW_KEY).toBeUndefined()
  })
})

describe('auditEvent', () => {
  let audit
  let auditEvent
  let AuditEvent

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('@defra/cdp-auditing', () => ({ audit: vi.fn() }))
    ;({ auditEvent, AuditEvent } = await import('./audit-event.js'))
    ;({ audit } = await import('@defra/cdp-auditing'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('calls audit with event and extracted agreement context', () => {
    const request = { params: { agreementId: 'AGR123' } }
    const agreementData = {
      agreementNumber: 'FPTT123456789',
      identifiers: { sbi: '106284736' }
    }

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, agreementData)

    expect(audit).toHaveBeenCalledWith({
      event: 'REVIEW_OFFER_VIEWED',
      agreement: {
        agreementId: 'AGR123',
        agreementNumber: 'FPTT123456789',
        sbi: '106284736'
      }
    })
  })

  test('handles missing request params gracefully', () => {
    auditEvent({}, AuditEvent.REVIEW_OFFER_VIEWED, {})

    expect(audit).toHaveBeenCalledWith({
      event: 'REVIEW_OFFER_VIEWED',
      agreement: {
        agreementId: undefined,
        agreementNumber: undefined,
        sbi: undefined
      }
    })
  })

  test('handles omitted agreementData gracefully', () => {
    const request = { params: { agreementId: 'AGR123' } }

    auditEvent(request, AuditEvent.REVIEW_OFFER_CONTINUED)

    expect(audit).toHaveBeenCalledWith({
      event: 'REVIEW_OFFER_CONTINUED',
      agreement: {
        agreementId: 'AGR123',
        agreementNumber: undefined,
        sbi: undefined
      }
    })
  })
})

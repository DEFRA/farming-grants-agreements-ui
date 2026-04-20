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
    expect(AuditEvent.ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED).toBe(
      'ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED'
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

  const createRequest = (overrides = {}) => ({
    params: { agreementId: 'AGR123' },
    auth: { credentials: { sessionId: 'session-abc' } },
    headers: {},
    info: { remoteAddress: '10.0.0.1' },
    ...overrides
  })

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

  test('calls audit with the correct top-level fields', () => {
    const request = createRequest()
    const agreementData = {
      agreementNumber: 'FPTT987654321',
      correlationId: 'corr-xyz'
    }

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, agreementData)

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionid: 'session-abc',
        correlationid: 'corr-xyz',
        datetime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        ip: '10.0.0.1'
      })
    )
  })

  test('calls audit with the correct security fields', () => {
    const request = createRequest()

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, {})

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          pmccode: '0706',
          details: expect.objectContaining({
            transactioncode: '2301',
            message: 'User viewed the review offer screen',
            additionalinfo: 'agreementId: AGR123'
          })
        })
      })
    )
  })

  test('calls audit with the correct audit fields', () => {
    const request = createRequest()
    const agreementData = { agreementNumber: 'FPTT987654321' }

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, agreementData)

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: expect.objectContaining({
          accounts: {},
          entities: [
            expect.objectContaining({
              entity: 'agreement',
              action: 'read',
              id: 'FPTT987654321'
            })
          ],
          status: 'success',
          details: agreementData
        })
      })
    )
  })

  test('builds accounts from agreementData, omitting undefined fields', () => {
    const request = createRequest()
    const agreementData = { sbi: '123456789', frn: 'FRN1' }

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, agreementData)

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: expect.objectContaining({
          accounts: { sbi: '123456789', frn: 'FRN1' }
        })
      })
    )
    const payload = audit.mock.calls[0][0]
    expect(payload.audit.accounts).not.toHaveProperty('crn')
  })

  test('passes failure status through to the audit payload', () => {
    const request = createRequest()

    auditEvent(request, AuditEvent.ACCEPT_OFFER_SUBMITTED, {}, 'failure')

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: expect.objectContaining({ status: 'failure' })
      })
    )
  })

  test('uses correct transaction code per event', () => {
    const request = createRequest()
    const cases = [
      [AuditEvent.REVIEW_OFFER_VIEWED, '2301'],
      [AuditEvent.REVIEW_OFFER_CONTINUED, '2302'],
      [AuditEvent.ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED, '2303'],
      [AuditEvent.ACCEPT_OFFER_SUBMITTED, '2304']
    ]

    for (const [event, expectedCode] of cases) {
      auditEvent(request, event)
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({
          security: expect.objectContaining({
            details: expect.objectContaining({ transactioncode: expectedCode })
          })
        })
      )
    }
  })

  test('falls back to agreementId from params when agreementNumber is absent', () => {
    const request = createRequest()

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, {})

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: expect.objectContaining({
          entities: [expect.objectContaining({ id: 'AGR123' })]
        })
      })
    )
  })

  test('handles missing auth gracefully', () => {
    const request = createRequest({ auth: undefined })

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, {})

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ sessionid: undefined })
    )
  })

  test('uses the correct action per event', () => {
    const request = createRequest()
    const cases = [
      [AuditEvent.REVIEW_OFFER_VIEWED, 'read'],
      [AuditEvent.REVIEW_OFFER_CONTINUED, 'read'],
      [AuditEvent.ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED, 'submitted'],
      [AuditEvent.ACCEPT_OFFER_SUBMITTED, 'accepted'],
      [AuditEvent.OFFER_ACCEPTED_VIEWED, 'read'],
      [AuditEvent.AGREEMENT_VIEWED, 'read']
    ]

    for (const [event, expectedAction] of cases) {
      audit.mockClear()
      auditEvent(request, event)
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({
          audit: expect.objectContaining({
            entities: [expect.objectContaining({ action: expectedAction })]
          })
        })
      )
    }
  })

  test('prefers x-forwarded-for over remoteAddress for ip', () => {
    const request = createRequest({
      headers: { 'x-forwarded-for': '203.0.113.5' }
    })

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, {})

    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '203.0.113.5' })
    )
  })
})

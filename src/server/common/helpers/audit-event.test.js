import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const TEST_TOPIC_ARN =
  'arn:aws:sns:eu-west-2:332499610595:fcp_audit_farming_grants_agreements_ui'

describe('AuditEvent', () => {
  let AuditEvent

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: function SNSClient() {},
      PublishCommand: function PublishCommand(params) {
        this.TopicArn = params.TopicArn
        this.Message = params.Message
      }
    }))
    vi.doMock('#~/config/config.js', () => ({
      config: { get: vi.fn() }
    }))
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
  let mockSend
  let auditEvent
  let AuditEvent

  const createRequest = (overrides = {}) => ({
    params: { agreementId: 'AGR123' },
    auth: { credentials: { sessionId: 'session-abc' } },
    headers: {},
    info: { remoteAddress: '10.0.0.1' },
    logger: { error: vi.fn() },
    ...overrides
  })

  const callAuditEvent = (
    request,
    event,
    agreementData = {},
    status = 'success'
  ) => {
    const client = { send: mockSend }
    auditEvent(request, event, agreementData, status, client)
  }

  const getPublishedPayload = () => {
    const command = mockSend.mock.calls[0][0]
    return JSON.parse(command.Message)
  }

  beforeEach(async () => {
    vi.resetModules()
    mockSend = vi.fn().mockResolvedValue({})
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: function SNSClient() {},
      PublishCommand: function PublishCommand(params) {
        this.TopicArn = params.TopicArn
        this.Message = params.Message
      }
    }))
    vi.doMock('#~/config/config.js', () => ({
      config: {
        get: vi.fn((key) =>
          key === 'snsTopicArnAudit' ? TEST_TOPIC_ARN : undefined
        )
      }
    }))
    ;({ auditEvent, AuditEvent } = await import('./audit-event.js'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('does nothing when snsTopicArnAudit is null', async () => {
    vi.resetModules()
    vi.doMock('@aws-sdk/client-sns', () => ({
      SNSClient: function SNSClient() {},
      PublishCommand: function PublishCommand(params) {
        this.TopicArn = params.TopicArn
        this.Message = params.Message
      }
    }))
    vi.doMock('#~/config/config.js', () => ({
      config: { get: vi.fn().mockReturnValue(null) }
    }))
    const { auditEvent: nullAuditEvent, AuditEvent: NullAuditEvent } =
      await import('./audit-event.js')

    nullAuditEvent(
      createRequest(),
      NullAuditEvent.REVIEW_OFFER_VIEWED,
      {},
      'success',
      { send: mockSend }
    )

    await Promise.resolve()
    expect(mockSend).not.toHaveBeenCalled()
  })

  test('publishes to the configured SNS topic ARN', async () => {
    callAuditEvent(createRequest(), AuditEvent.REVIEW_OFFER_VIEWED, {})

    await Promise.resolve()
    expect(mockSend).toHaveBeenCalledOnce()
    const command = mockSend.mock.calls[0][0]
    expect(command.TopicArn).toBe(TEST_TOPIC_ARN)
    expect(command.Message).toEqual(expect.any(String))
  })

  test('publishes the correct top-level fields', async () => {
    const agreementData = {
      agreementNumber: 'FPTT987654321',
      correlationId: 'corr-xyz'
    }

    callAuditEvent(
      createRequest(),
      AuditEvent.REVIEW_OFFER_VIEWED,
      agreementData
    )

    await Promise.resolve()
    const payload = getPublishedPayload()
    expect(payload).toMatchObject({
      sessionid: 'session-abc',
      correlationid: 'corr-xyz',
      datetime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      ip: '10.0.0.1'
    })
  })

  test('publishes the correct security fields', async () => {
    callAuditEvent(createRequest(), AuditEvent.REVIEW_OFFER_VIEWED, {})

    await Promise.resolve()
    const payload = getPublishedPayload()
    expect(payload.security).toMatchObject({
      pmccode: '0706',
      details: {
        transactioncode: '2301',
        message: 'User viewed the review offer screen',
        additionalinfo: 'agreementId: AGR123'
      }
    })
  })

  test('published audit contains accounts and entities', async () => {
    const agreementData = {
      agreementNumber: 'FPTT987',
      sbi: '123',
      frn: 'FRN1'
    }

    callAuditEvent(
      createRequest(),
      AuditEvent.REVIEW_OFFER_VIEWED,
      agreementData
    )

    await Promise.resolve()
    const payload = getPublishedPayload()
    expect(payload.audit.accounts).toEqual({ sbi: '123', frn: 'FRN1' })
    expect(payload.audit.accounts).not.toHaveProperty('crn')
    expect(payload.audit.entities).toEqual([
      { entity: 'agreement', action: 'read', id: 'FPTT987' }
    ])
  })

  test('builds accounts omitting undefined fields', async () => {
    const agreementData = { sbi: '123456789', frn: 'FRN1' }

    callAuditEvent(
      createRequest(),
      AuditEvent.REVIEW_OFFER_VIEWED,
      agreementData
    )

    await Promise.resolve()
    const payload = getPublishedPayload()
    expect(payload.audit.accounts).toEqual({ sbi: '123456789', frn: 'FRN1' })
    expect(payload.audit.accounts).not.toHaveProperty('crn')
  })

  test('entities id falls back to agreementId from params when agreementNumber is absent', async () => {
    callAuditEvent(createRequest(), AuditEvent.REVIEW_OFFER_VIEWED, {})

    await Promise.resolve()
    const payload = getPublishedPayload()
    expect(payload.audit.entities[0].id).toBe('AGR123')
  })

  test('passes failure status through', async () => {
    callAuditEvent(
      createRequest(),
      AuditEvent.ACCEPT_OFFER_SUBMITTED,
      {},
      'failure'
    )

    await Promise.resolve()
    const payload = getPublishedPayload()
    expect(payload.audit.status).toBe('failure')
  })

  test('uses correct action per event in entities', async () => {
    const cases = [
      [AuditEvent.REVIEW_OFFER_VIEWED, 'read'],
      [AuditEvent.REVIEW_OFFER_CONTINUED, 'read'],
      [AuditEvent.ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED, 'submitted'],
      [AuditEvent.ACCEPT_OFFER_SUBMITTED, 'accepted'],
      [AuditEvent.OFFER_ACCEPTED_VIEWED, 'read'],
      [AuditEvent.AGREEMENT_VIEWED, 'read']
    ]

    for (const [event, expectedAction] of cases) {
      mockSend.mockClear()
      callAuditEvent(createRequest(), event)
      await Promise.resolve()
      const payload = getPublishedPayload()
      expect(payload.audit.entities[0].action).toBe(expectedAction)
    }
  })

  test('uses correct transaction code per event', async () => {
    const cases = [
      [AuditEvent.REVIEW_OFFER_VIEWED, '2301'],
      [AuditEvent.REVIEW_OFFER_CONTINUED, '2302'],
      [AuditEvent.ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED, '2303'],
      [AuditEvent.ACCEPT_OFFER_SUBMITTED, '2304']
    ]

    for (const [event, expectedCode] of cases) {
      mockSend.mockClear()
      callAuditEvent(createRequest(), event)
      await Promise.resolve()
      const payload = getPublishedPayload()
      expect(payload.security.details.transactioncode).toBe(expectedCode)
    }
  })

  test('logs error when SNS publish fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('SNS down'))
    const request = createRequest()

    callAuditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, {})

    await Promise.resolve()
    await Promise.resolve()
    expect(request.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Failed to publish audit event to SNS'
    )
  })

  test('prefers x-forwarded-for over remoteAddress for ip', async () => {
    const request = createRequest({
      headers: { 'x-forwarded-for': '203.0.113.5' }
    })

    callAuditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, {})

    await Promise.resolve()
    const payload = getPublishedPayload()
    expect(payload.ip).toBe('203.0.113.5')
  })

  test('handles missing auth gracefully', async () => {
    const request = createRequest({ auth: undefined })

    callAuditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, {})

    await Promise.resolve()
    const payload = getPublishedPayload()
    expect(payload.sessionid).toBeUndefined()
  })
})

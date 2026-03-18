import { audit } from '@defra/cdp-auditing'

import { config } from '#~/config/config.js'

export const AuditEvent = Object.freeze({
  REVIEW_OFFER_VIEWED: 'REVIEW_OFFER_VIEWED',
  REVIEW_OFFER_CONTINUED: 'REVIEW_OFFER_CONTINUED',
  ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED:
    'ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED',
  ACCEPT_OFFER_SUBMITTED: 'ACCEPT_OFFER_SUBMITTED'
})

// Human-readable description for each audit event, used in security.details.message
const eventMessages = {
  [AuditEvent.REVIEW_OFFER_VIEWED]: 'User viewed the review offer screen',
  [AuditEvent.REVIEW_OFFER_CONTINUED]:
    'User continued from review offer to accept offer screen',
  [AuditEvent.ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED]:
    'User submitted the Accept offer form but the "I have read the information (checkbox)" has not been selected',
  [AuditEvent.ACCEPT_OFFER_SUBMITTED]: 'User selected Accept offer'
}

// Transaction code for each audit event, used in security.details.transactioncode
const eventTransactionCodes = {
  [AuditEvent.REVIEW_OFFER_VIEWED]: '2301',
  [AuditEvent.REVIEW_OFFER_CONTINUED]: '2302',
  [AuditEvent.ACCEPT_OFFER_DECLARATION_NOT_CONFIRMED]: '2303',
  [AuditEvent.ACCEPT_OFFER_SUBMITTED]: '2304'
}

/**
 * Builds the full audit payload conforming to the agreed schema.
 * Fields marked UNKNOWN require future work to source from decoded auth or other context.
 * Fields marked HARDCODED are fixed values pending clarification with the audit team.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {AuditEvent[keyof AuditEvent]} event
 * @param {object} [agreementData]
 * @param {'success'|'failure'} [status]
 */
const buildAuditPayload = (
  request,
  event,
  agreementData = {},
  status = 'success'
) => ({
  user: request.payload?.requesterUsername,
  sessionid: request.auth?.credentials?.sessionId,
  correlationid: agreementData.correlationId,
  datetime: new Date().toISOString(),
  environment: config.get('cdpEnvironment'),
  version: '0.1.0',
  application: 'Grants',
  component: config.get('serviceName'),
  ip: request.headers['x-forwarded-for'] ?? request.info?.remoteAddress,

  security: {
    pmccode: '0706', // Consider all actions an internal or external user can execute, for example the menu options available to them
    priority: '0', // 0 = happens all the time; 5 = unusual; 9 = very rare
    details: {
      transactioncode: eventTransactionCodes[event],
      message: eventMessages[event],
      additionalinfo: `agreementId: ${request.params?.agreementId}`
    }
  },

  audit: {
    eventtype: 'GrantsAcceptAgreement',
    action: event,
    entity: 'Agreements',
    entityid: agreementData.agreementNumber ?? request.params?.agreementId,
    status,
    details: agreementData
  }
})

/**
 * Records an audit event enriched with request and agreement context.
 * @param {import('@hapi/hapi').Request} request
 * @param {AuditEvent[keyof AuditEvent]} event
 * @param {object} [agreementData] - Agreement data from the API pre-handler
 * @param {'success'|'failure'} [status] - Outcome of the action being audited
 */
export const auditEvent = (
  request,
  event,
  agreementData = {},
  status = 'success'
) => {
  audit(buildAuditPayload(request, event, agreementData, status))
}

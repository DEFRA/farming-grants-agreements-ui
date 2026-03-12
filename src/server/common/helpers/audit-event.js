import { audit } from '@defra/cdp-auditing'

export const AuditEvent = Object.freeze({
  REVIEW_OFFER_VIEWED: 'REVIEW_OFFER_VIEWED',
  REVIEW_OFFER_CONTINUED: 'REVIEW_OFFER_CONTINUED'
})

/**
 * Extracts non-PII agreement context from the request and agreement data.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} [agreementData]
 * @returns {{ agreementId: string, agreementNumber: string, sbi: string }}
 */
const getAgreementContext = (request, agreementData = {}) => ({
  agreementId: request.params?.agreementId,
  agreementNumber: agreementData.agreementNumber,
  sbi: agreementData.identifiers?.sbi
})

/**
 * Records an audit event enriched with agreement context.
 * @param {import('@hapi/hapi').Request} request
 * @param {AuditEvent[keyof AuditEvent]} event
 * @param {object} [agreementData] - Agreement data from the API pre-handler
 */
export const auditEvent = (request, event, agreementData = {}) => {
  audit({ event, agreement: getAgreementContext(request, agreementData) })
}

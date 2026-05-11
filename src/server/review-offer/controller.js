import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'
import { getGrantTypeFor } from '#~/server/grant-types/index.js'

export const reviewOfferController = {
  async handler(request, h) {
    const source = request?.pre?.data ?? {}
    const agreementData = source.agreementData || {}
    const { reviewOffer } = getGrantTypeFor(agreementData)

    auditEvent(request, AuditEvent.REVIEW_OFFER_VIEWED, agreementData)

    return h.view(
      reviewOffer.template,
      reviewOffer.buildModel({ agreementData })
    )
  }
}

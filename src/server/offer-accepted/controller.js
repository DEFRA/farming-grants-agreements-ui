import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'
import { getGrantTypeFor } from '#~/server/grant-types/grant-types.js'

export const offerAcceptedController = {
  async handler(request, h) {
    const { agreementData } = request.pre?.data || {}
    const { offerAccepted } = getGrantTypeFor(agreementData)

    auditEvent(request, AuditEvent.OFFER_ACCEPTED_VIEWED, agreementData)

    return h.view(
      offerAccepted.template,
      offerAccepted.buildModel({ agreementData })
    )
  }
}

import { getBaseUrl } from '#~/server/common/helpers/base-url.js'
import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'
import { getGrantTypeFor } from '#~/server/grant-types/index.js'
import { GAS } from '#~/server/common/helpers/api.js'
import { configDrivenAgreementController } from '#~/server/config-driven-agreement/controller.js'

export const viewAgreementController = {
  async handler(request, h) {
    if (request.pre?.data?.source === GAS) {
      return configDrivenAgreementController.handler(request, h)
    }

    const { agreementData, auth } = request.pre?.data || {}

    if (
      agreementData?.status === 'offered' &&
      auth?.source === 'defra' &&
      request.params.mode !== 'print'
    ) {
      return h.redirect(getBaseUrl(request))
    }

    auditEvent(request, AuditEvent.AGREEMENT_VIEWED, agreementData)

    const isTerminated = agreementData?.status === 'terminated'

    if (isTerminated) {
      return h.view('view-agreement/agreement-ended', {
        pageTitle: 'Agreement ended',
        agreementEndDate: agreementData.updatedAt
      })
    }

    const { viewAgreement } = getGrantTypeFor(agreementData)

    return h.view(
      viewAgreement.template,
      viewAgreement.buildModel({ agreementData })
    )
  }
}

import { buildAgreementViewModel } from '#~/server/common/helpers/build-view-agreement-model.js'
import { getBaseUrl } from '#~/server/common/helpers/base-url.js'
import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'

export const viewAgreementController = {
  async handler(request, h) {
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
    const isPastEndDate =
      agreementData?.payment?.agreementEndDate &&
      new Date() > new Date(agreementData.payment.agreementEndDate)

    if (isTerminated || isPastEndDate) {
      return h.view('view-agreement/agreement-ended', {
        pageTitle: 'Agreement ended',
        agreementEndDate: agreementData.payment.agreementEndDate
      })
    }

    return h.view('view-agreement/index', {
      pageTitle: 'Farm payments technical test agreement document',
      ...buildAgreementViewModel(agreementData)
    })
  }
}

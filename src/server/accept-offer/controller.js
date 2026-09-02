import { apiRequest, getBackend } from '#~/server/common/helpers/api.js'
import { getBaseUrl } from '#~/server/common/helpers/base-url.js'
import { auditEvent, AuditEvent } from '#~/server/common/helpers/audit-event.js'
import { extractJwtPayload } from '#~/server/common/helpers/jwt-auth.js'
import { getAgreementAuthentication } from '#~/server/agreement/agreement-request.js'
import { getGrantTypeFor } from '#~/server/grant-types/index.js'
import path from 'node:path'

const generateRedirectUrl = (request, agreementId = '') => {
  const redirectUrl = path.join(getBaseUrl(request), agreementId)
  const queryString = request.url.search || ''
  return `${redirectUrl}${queryString}`
}

export const validateAcceptOfferController = {
  async handler(request, h) {
    const { agreementId = '' } = request.params
    const { agreementData } = request.pre?.data || {}
    const { acceptOffer } = getGrantTypeFor(agreementData)

    // Perform grant-specific validation
    const validation = acceptOffer.validate(request, agreementData)

    if (!validation.isValid) {
      return h.view(acceptOffer.template, {
        ...acceptOffer.buildModel({
          agreementData,
          errorMessage: {
            text: validation.errorMessage
          }
        })
      })
    }

    // Checkbox confirmed - now submit the accept-offer action to the API
    try {
      // FGP-1307: caller token is read from the request header only.
      const auth = getAgreementAuthentication(request)
      const jwtPayload = extractJwtPayload(auth)
      const backend = getBackend(jwtPayload)

      await apiRequest({
        agreementId,
        method: 'POST',
        auth,
        body: { action: 'accept-offer' },
        backend,
        jwtPayload
      })
      auditEvent(
        request,
        AuditEvent.ACCEPT_OFFER_SUBMITTED,
        agreementData,
        'success'
      )
    } catch (error) {
      auditEvent(
        request,
        AuditEvent.ACCEPT_OFFER_SUBMITTED,
        agreementData,
        'failure'
      )
      throw error
    }

    // Redirect to the offer accepted page
    return h.redirect(generateRedirectUrl(request))
  }
}

export const acceptOfferController = {
  async handler(request, h) {
    const action = request?.payload?.action
    const { agreementId = '' } = request.params
    const { agreementData } = request.pre?.data || {}
    const { acceptOffer } = getGrantTypeFor(agreementData)

    if (action === 'accept-offer' && agreementData.status === 'offered') {
      return h.redirect(generateRedirectUrl(request, agreementId))
    }

    auditEvent(request, AuditEvent.REVIEW_OFFER_CONTINUED, agreementData)

    return h.view(
      acceptOffer.template,
      acceptOffer.buildModel({ agreementData })
    )
  }
}

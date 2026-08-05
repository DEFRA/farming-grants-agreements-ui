import Boom from '@hapi/boom'

import { getBaseUrl } from '#~/server/common/helpers/base-url.js'
import { statusCodes } from '#~/server/common/constants/status-codes.js'
import {
  GAS,
  gasActionRequest,
  getBackend
} from '#~/server/common/helpers/api.js'
import { extractJwtPayload } from '#~/server/common/helpers/jwt-auth.js'
import { renderConfigDrivenAgreement } from '#~/server/config-driven-agreement/controller.js'

import {
  createActionTransport,
  extractActionSubmission
} from './action-transport.js'
import {
  translateGasAgreementLocation,
  translateGasLocation
} from './agreement-paths.js'
import {
  getAgreementAuthentication,
  getGasQueryParams,
  getQueryAuthentication
} from './agreement-request.js'

export const getGasActionAuthentication = (request) => {
  const authToken = getAgreementAuthentication(request)
  const jwtPayload = extractJwtPayload(authToken)

  if (!jwtPayload) {
    throw Boom.unauthorized(
      'Your account is not authorised to view/accept this offer agreement'
    )
  }

  if (getBackend(jwtPayload) !== GAS) {
    throw Boom.notFound('Agreement action not found')
  }

  if (jwtPayload.source !== 'defra') {
    throw Boom.notFound('Agreement action not found')
  }

  return { jwtPayload }
}

const requireEtag = (etag) => {
  if (typeof etag !== 'string') {
    throw Boom.badGateway('GAS response did not include an ETag header')
  }
  return etag
}

const renderActionPage = (request, h, pageModel, etag, idempotencyKey) =>
  renderConfigDrivenAgreement(
    request,
    h,
    pageModel,
    createActionTransport(requireEtag(etag), idempotencyKey)
  )

export const agreementActionController = {
  async get(request, h) {
    const { agreementId, actionName } = request.params
    const { jwtPayload } = request.pre.actionAuthentication
    const response = await gasActionRequest({
      agreementId,
      actionName,
      queryParams: getGasQueryParams(request),
      jwtPayload
    })

    return renderActionPage(request, h, response.pageModel, response.etag)
  },

  async post(request, h) {
    const { agreementId, actionName } = request.params
    const { jwtPayload } = request.pre.actionAuthentication
    const { etag, idempotencyKey, values } = extractActionSubmission(
      request.payload
    )
    const response = await gasActionRequest({
      agreementId,
      actionName,
      method: 'POST',
      body: { values },
      etag,
      idempotencyKey,
      queryParams: getGasQueryParams(request),
      jwtPayload
    })

    if (response.status === statusCodes.unprocessableEntity) {
      return renderActionPage(
        request,
        h,
        response.pageModel,
        response.etag,
        idempotencyKey
      ).code(statusCodes.unprocessableEntity)
    }

    if (response.status === statusCodes.preconditionFailed) {
      const publicLocation = translateGasAgreementLocation(
        response.location,
        agreementId,
        getBaseUrl(request),
        getQueryAuthentication(request)
      )
      return h.redirect(publicLocation).code(statusCodes.seeOther)
    }

    if (response.status === statusCodes.seeOther) {
      const publicLocation = translateGasLocation(
        response.location,
        getBaseUrl(request),
        getQueryAuthentication(request)
      )
      return h.redirect(publicLocation).code(statusCodes.seeOther)
    }

    throw Boom.badGateway(`Unexpected GAS action response: ${response.status}`)
  }
}

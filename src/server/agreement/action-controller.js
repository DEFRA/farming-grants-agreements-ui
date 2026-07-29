import Boom from '@hapi/boom'

import { getBaseUrl } from '#~/server/common/helpers/base-url.js'
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
import { translateGasLocation } from './agreement-paths.js'

const getAuthToken = (request) =>
  request.headers['x-encrypted-auth'] || request.query['x-encrypted-auth']

export const getGasActionAuthentication = (request) => {
  const authToken = getAuthToken(request)
  const jwtPayload = extractJwtPayload(authToken)

  if (!jwtPayload) {
    throw Boom.unauthorized(
      'Your account is not authorised to view/accept this offer agreement'
    )
  }

  if (getBackend(jwtPayload) !== GAS) {
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
      jwtPayload
    })

    if (response.status === 422) {
      return renderActionPage(
        request,
        h,
        response.pageModel,
        response.etag,
        idempotencyKey
      ).code(422)
    }

    if ([303, 412].includes(response.status)) {
      const publicLocation = translateGasLocation(
        response.location,
        getBaseUrl(request)
      )
      return h.redirect(publicLocation).code(303)
    }

    throw Boom.badGateway(`Unexpected GAS action response: ${response.status}`)
  }
}

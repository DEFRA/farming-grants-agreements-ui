import { createHash } from 'node:crypto'

import Boom from '@hapi/boom'
import { agreementController } from './controller.js'
import { apiRequest, GAS, getBackend } from '#~/server/common/helpers/api.js'
import { extractJwtPayload } from '#~/server/common/helpers/jwt-auth.js'
import { viewAgreementController } from '#~/server/view-agreement/controller.js'
import {
  agreementActionController,
  getGasActionAuthentication
} from './action-controller.js'
import {
  encryptedAuthQueryName,
  getAgreementAuthentication,
  getGasQueryParams
} from './agreement-request.js'

const getAgreementMethod = (payload) =>
  payload?.action === 'accept-offer' ? 'POST' : 'GET'

const getAgreementBody = (method, payload) =>
  method === 'POST' ? payload : undefined

const getAgreementQueryParams = (request, backend) => {
  if (backend === GAS) {
    return {}
  }

  const queryParams = getGasQueryParams(request)
  delete queryParams.mode

  if (request.params.mode === 'print') {
    queryParams.mode = 'print'
  }

  return queryParams
}

const assertSupportedGasMode = (backend, mode) => {
  if (backend === GAS && mode && mode !== 'print') {
    throw Boom.notFound('Agreement route not found')
  }
}

const getAuthTokenFingerprint = (token) =>
  typeof token === 'string'
    ? createHash('sha256').update(token).digest('hex').slice(0, 16)
    : null

const getRawAuthHeaders = (request) => {
  const rawHeaders = request.raw?.req?.rawHeaders ?? []

  return rawHeaders.flatMap((name, index) =>
    index % 2 === 0 && name.toLowerCase() === encryptedAuthQueryName
      ? [rawHeaders[index + 1]]
      : []
  )
}

const getAgreementData = async (request) => {
  const { agreementId = '' } = request.params
  const method = getAgreementMethod(request.payload)
  const authToken = getAgreementAuthentication(request)

  const jwtPayload = extractJwtPayload(authToken, request.logger)

  if (!jwtPayload) {
    const rawAuthHeaders = getRawAuthHeaders(request)
    const isStringToken = typeof authToken === 'string'

    request.logger.warn(
      {
        requestId: request.info.id,
        xCdpRequestId: request.headers?.['x-cdp-request-id'],
        hasAuthHeader: Boolean(request.headers?.[encryptedAuthQueryName]),
        hasAuthQuery: Boolean(request.query?.[encryptedAuthQueryName]),
        authTokenType: typeof authToken,
        authTokenLength: isStringToken ? authToken.length : null,
        authTokenFingerprint: getAuthTokenFingerprint(authToken),
        authTokenSegmentCount: isStringToken
          ? authToken.split('.').length
          : null,
        authTokenHasOuterWhitespace: isStringToken
          ? authToken !== authToken.trim()
          : null,
        rawAuthHeaderCount: rawAuthHeaders.length,
        rawAuthHeaderLengths: rawAuthHeaders.map((header) => header.length),
        rawAuthHeaderFingerprints: rawAuthHeaders.map(getAuthTokenFingerprint)
      },
      'Agreement JWT authentication failed'
    )

    throw Boom.unauthorized(
      'Your account is not authorised to view/accept this offer agreement'
    )
  }

  const backend = getBackend(jwtPayload)
  assertSupportedGasMode(backend, request.params.mode)

  return apiRequest({
    agreementId,
    method,
    auth: authToken,
    body: getAgreementBody(method, request.payload),
    backend,
    jwtPayload,
    queryParams: getAgreementQueryParams(request, backend)
  })
}

const gasActionPre = [
  {
    method: getGasActionAuthentication,
    assign: 'actionAuthentication'
  }
]

const gasActionPayload = {
  allow: 'application/x-www-form-urlencoded',
  output: 'data',
  parse: true,
  maxBytes: 64 * 1024
}

/**
 * Sets up the routes used in the agreement page.
 * These routes are registered in src/server/router.js.
 */
export const agreement = {
  plugin: {
    name: 'agreement',
    register(server) {
      server.route([
        {
          method: ['GET', 'POST'],
          path: '/',
          options: {
            // Injects into `request.pre?.data`
            pre: [{ method: getAgreementData, assign: 'data' }]
          },
          ...agreementController
        },
        {
          method: 'GET',
          path: '/{agreementId}/actions/{actionName}',
          options: {
            pre: gasActionPre
          },
          handler: agreementActionController.get
        },
        {
          method: 'POST',
          path: '/{agreementId}/actions/{actionName}',
          options: {
            pre: gasActionPre,
            payload: gasActionPayload
          },
          handler: agreementActionController.post
        },
        {
          method: 'GET',
          path: '/{agreementId}/{mode?}',
          options: {
            pre: [{ method: getAgreementData, assign: 'data' }]
          },
          ...viewAgreementController
        }
      ])
    }
  }
}

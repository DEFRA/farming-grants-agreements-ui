import Boom from '@hapi/boom'
import { agreementController } from './controller.js'
import {
  apiRequest,
  GAS,
  getBackend,
  LEGACY
} from '#~/server/common/helpers/api.js'
import { statusCodes } from '#~/server/common/constants/status-codes.js'
import { extractJwtPayload } from '#~/server/common/helpers/jwt-auth.js'
import { createLogger } from '#~/server/common/helpers/logging/logger.js'
import { viewAgreementController } from '#~/server/view-agreement/controller.js'
import {
  agreementActionController,
  getGasActionAuthentication
} from './action-controller.js'
import {
  getAgreementAuthentication,
  getGasQueryParams
} from './agreement-request.js'

const logger = createLogger()

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

const shouldUseLegacyFallback = (options, error) =>
  options.backend === GAS &&
  options.method === 'GET' &&
  Boolean(options.agreementId) &&
  Boom.isBoom(error) &&
  error.output.statusCode === statusCodes.notFound

const requestAgreement = async (options, request) => {
  try {
    return await apiRequest(options)
  } catch (error) {
    if (!shouldUseLegacyFallback(options, error)) {
      throw error
    }

    logger.info('GAS agreement not found; retrying the legacy backend')
    return apiRequest({
      ...options,
      backend: LEGACY,
      queryParams: getAgreementQueryParams(request, LEGACY)
    })
  }
}

const getAgreementData = async (request) => {
  const { agreementId = '' } = request.params
  const method = getAgreementMethod(request.payload)
  const authToken = getAgreementAuthentication(request)

  const jwtPayload = extractJwtPayload(authToken)

  if (!jwtPayload) {
    throw Boom.unauthorized(
      'Your account is not authorised to view/accept this offer agreement'
    )
  }

  const backend = getBackend(jwtPayload)
  assertSupportedGasMode(backend, request.params.mode)

  return requestAgreement(
    {
      agreementId,
      method,
      auth: authToken,
      body: getAgreementBody(method, request.payload),
      backend,
      jwtPayload,
      queryParams: getAgreementQueryParams(request, backend)
    },
    request
  )
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

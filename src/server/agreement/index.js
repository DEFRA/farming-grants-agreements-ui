import Boom from '@hapi/boom'
import { agreementController } from './controller.js'
import { apiRequest, getBackend } from '#~/server/common/helpers/api.js'
import { extractJwtPayload } from '#~/server/common/helpers/jwt-auth.js'
import { viewAgreementController } from '#~/server/view-agreement/controller.js'

const getAgreementMethod = (payload) =>
  payload?.action === 'accept-offer' ? 'POST' : 'GET'

const getAuthToken = (request) =>
  request.headers['x-encrypted-auth'] || request.query['x-encrypted-auth']

const getAgreementBody = (method, payload) =>
  method === 'POST' ? payload : undefined

const getAgreementQueryParams = (mode) =>
  mode === 'print' ? { mode } : undefined

const getAgreementData = async (request) => {
  const { agreementId = '' } = request.params
  const method = getAgreementMethod(request.payload)
  const authToken = getAuthToken(request)

  const jwtPayload = extractJwtPayload(authToken)

  if (!jwtPayload) {
    throw Boom.unauthorized(
      'Your account is not authorised to view/accept this offer agreement'
    )
  }

  const backend = getBackend(jwtPayload)

  return apiRequest({
    agreementId,
    method,
    auth: authToken,
    body: getAgreementBody(method, request.payload),
    backend,
    jwtPayload,
    queryParams: getAgreementQueryParams(request.params.mode)
  })
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

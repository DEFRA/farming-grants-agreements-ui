import Boom from '@hapi/boom'
import { agreementController } from './controller.js'
import { apiRequest, getBackend } from '#~/server/common/helpers/api.js'
import { extractJwtPayload } from '#~/server/common/helpers/jwt-auth.js'
import { createLogger } from '#~/server/common/helpers/logging/logger.js'
import { viewAgreementController } from '#~/server/view-agreement/controller.js'

const logger = createLogger()

const getAgreementData = async (request) => {
  const { agreementId = '' } = request.params
  const action = request?.payload?.action
  const method = action === 'accept-offer' ? 'POST' : 'GET'
  // const authData = request.auth.credentials?.authData
  // const authToken =
  //   authData?.authToken ||
  //   request.headers['x-encrypted-auth'] ||
  //   request.query['x-encrypted-auth']

  const jwtPayload = extractJwtPayload(
    request.headers['x-encrypted-auth'],
    logger
  )

  if (!jwtPayload) {
    throw Boom.unauthorized(
      'Your account is not authorised to view/accept this offer agreement'
    )
  }

  const backend = getBackend(jwtPayload)

  return {
    ...(await apiRequest({
      agreementId,
      method,
      auth:
        request.headers['x-encrypted-auth'] ||
        request.query['x-encrypted-auth'],
      body: method === 'POST' ? request.payload : undefined,
      backend,
      jwtPayload
    }))
  }
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

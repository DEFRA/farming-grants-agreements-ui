import { agreementController } from './controller.js'
import { apiRequest } from '../common/helpers/api.js'

const getAgreementData = async (request) => {
  const { agreementId } = request.params
  const action = request?.payload?.action

  return await apiRequest({
    agreementId,
    method: action === 'accept-offer' ? 'POST' : 'GET',
    auth: request.headers['x-encrypted-auth']
  })
}

const getAgreementsByAuth = async (request) => {
  return await apiRequest({
    agreementId: '',
    method: 'GET',
    auth: request.headers['x-encrypted-auth']
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
          path: '/{agreementId}',
          options: {
            pre: [
              { method: getAgreementData, assign: 'data' } // Injects into `request.pre?.data`
            ]
          },
          ...agreementController
        },
        {
          method: 'GET',
          path: '/',
          options: {
            pre: [{ method: getAgreementsByAuth, assign: 'data' }]
          },
          ...agreementController
        }
      ])
    }
  }
}

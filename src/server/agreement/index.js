import { agreementController } from './controller.js'
import { apiRequest } from '../common/helpers/api.js'
import { viewAgreementController } from '../view-agreement/controller.js'

const getAgreementData = async (request) => {
  const { agreementId = '' } = request.params
  const action = request?.payload?.action

  return apiRequest({
    agreementId,
    method: action === 'accept-offer' ? 'POST' : 'GET',
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
          path: '/',
          options: {
            // Injects into `request.pre?.data`
            pre: [{ method: getAgreementData, assign: 'data' }]
          },
          ...agreementController
        },
        {
          method: 'GET',
          path: '/{agreementId}',
          options: {
            pre: [{ method: getAgreementData, assign: 'data' }]
          },
          ...viewAgreementController
        }
      ])
    }
  }
}

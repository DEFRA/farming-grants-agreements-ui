import { agreementController } from './controller.js'
import { apiRequest } from '../common/helpers/api.js'

const getAgreementData = async (request, h) => {
  const { agreementId } = request.params
  const action = request?.payload?.action

  const { agreementData, pageData } = await apiRequest({
    agreementId,
    method: 'POST',
    auth: request.headers['x-encrypted-auth'],
    ...(action ? { body: { action } } : {})
  })

  return { agreementData, pageData }
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
              { method: getAgreementData, assign: 'data' } // Injects into `request.pre?.data.user`
            ]
          },
          ...agreementController
        }
      ])
    }
  }
}

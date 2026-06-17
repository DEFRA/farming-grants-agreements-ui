import { agreementController } from './controller.js'
import { apiRequest } from '#~/server/common/helpers/api.js'
import {
  isConfigDrivenAgreementId,
  isConfigDrivenGrantCode
} from '#~/server/common/helpers/config-driven-agreements.js'
import { configDrivenAgreementController } from '#~/server/config-driven-agreement/controller.js'
import { viewAgreementController } from '#~/server/view-agreement/controller.js'

const decodeAgreementAuthContext = (auth) => {
  try {
    const [, payload] = String(auth ?? '').split('.')

    if (!payload) {
      return {}
    }

    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

const getCurrentAgreementContext = ({ agreementId, auth }) => {
  if (agreementId) {
    return undefined
  }

  const authContext = decodeAgreementAuthContext(auth)
  const { clientRef, grantCode, sbi } = authContext

  if (
    !isConfigDrivenGrantCode(grantCode) ||
    typeof clientRef !== 'string' ||
    typeof sbi !== 'string'
  ) {
    return undefined
  }

  return {
    clientRef,
    code: grantCode,
    sbi
  }
}

const getConfigDrivenPage = ({ auth, mode }) => {
  if (decodeAgreementAuthContext(auth).source === 'entra') {
    return 'view'
  }

  if (mode === 'print') {
    return 'view'
  }

  if (mode) {
    return mode
  }

  return undefined
}

const getAgreementData = async (request) => {
  const { agreementId = '', actionName, mode } = request.params
  const isConfigDriven = isConfigDrivenAgreementId(agreementId)
  const action = request?.payload?.action
  const method = action === 'accept-offer' || actionName ? 'POST' : 'GET'
  const auth =
    request.headers['x-encrypted-auth'] || request.query['x-encrypted-auth']
  const currentAgreement = getCurrentAgreementContext({ agreementId, auth })

  return apiRequest({
    agreementId,
    method,
    backend: isConfigDriven || currentAgreement ? 'gas' : 'legacy',
    actionName,
    currentAgreement,
    page:
      isConfigDriven && method === 'GET'
        ? getConfigDrivenPage({ auth, mode })
        : undefined,
    auth,
    body: method === 'POST' ? request.payload : undefined
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
          method: ['GET', 'POST'],
          path: '/agreement',
          options: {
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
        },
        {
          method: 'GET',
          path: '/agreement/{agreementId}/{mode?}',
          options: {
            pre: [{ method: getAgreementData, assign: 'data' }]
          },
          ...viewAgreementController
        },
        {
          method: 'POST',
          path: '/{agreementId}/actions/{actionName}',
          options: {
            pre: [{ method: getAgreementData, assign: 'data' }]
          },
          ...configDrivenAgreementController
        },
        {
          method: 'POST',
          path: '/agreement/{agreementId}/actions/{actionName}',
          options: {
            pre: [{ method: getAgreementData, assign: 'data' }]
          },
          ...configDrivenAgreementController
        }
      ])
    }
  }
}

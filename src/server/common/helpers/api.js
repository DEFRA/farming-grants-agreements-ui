import Boom from '@hapi/boom'

import { config } from '../../../config/config.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const apiRequest = async ({
  agreementId,
  method = 'GET',
  auth,
  body
}) => {
  const response = await fetch(`${config.get('backend.url')}/${agreementId}`, {
    method,
    headers: {
      ...(method.toUpperCase() !== 'GET'
        ? { 'Content-Type': 'application/json' }
        : {}),
      'x-encrypted-auth': auth
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  if (!response.ok) {
    if (response.status === statusCodes.notFound) {
      throw Boom.notFound(`Offer not found with ID ${agreementId}`)
    }
    if (response.status === statusCodes.forbidden) {
      throw Boom.unauthorized(
        'Your account is not authorised to view/accept this offer agreement'
      )
    }

    throw new Error('Unable to load agreement', { cause: response })
  }

  return response.json()
}

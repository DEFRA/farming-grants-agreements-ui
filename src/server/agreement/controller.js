import Boom from '@hapi/boom'

import { config } from '../../config/config.js'

const getDataFromApi = async (auth, agreementId) => {
  const response = await fetch(`${config.get('backend.url')}/${agreementId}`, {
    headers: {
      'x-encrypted-auth': auth
    }
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw Boom.notFound(`Offer not found with ID ${agreementId}`)
    }

    throw new Error('Unable to load agreement', { cause: response })
  }

  return response.json()
}

/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 */
export const agreementController = {
  async handler(request, h) {
    const agreement = await getDataFromApi(
      request.headers['x-encrypted-auth'],
      request.params.agreementId
    )

    return h.view('view-offer/index', {
      pageTitle: 'Review your funding offer',
      ...agreement
    })
  }
}

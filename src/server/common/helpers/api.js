import Boom from '@hapi/boom'

import { config } from '#~/config/config.js'
import { statusCodes } from '#~/server/common/constants/status-codes.js'

export const apiRequest = async ({
  agreementId,
  method = 'GET',
  auth,
  body,
  backend = 'legacy',
  actionName,
  currentAgreement,
  page
}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(new Error('Network timed out while fetching data')),
    config.get('backend.timeout')
  )

  let response
  const gasAuthToken = config.get('gasBackend.authToken')

  try {
    response = await fetch(
      buildBackendUrl({
        agreementId,
        actionName,
        backend,
        currentAgreement,
        page
      }),
      {
        method,
        headers: {
          ...(method.toUpperCase() === 'GET'
            ? {}
            : { 'Content-Type': 'application/json' }),
          ...(backend === 'gas' && gasAuthToken
            ? { Authorization: `Bearer ${gasAuthToken}` }
            : {}),
          'x-encrypted-auth': auth
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal
      }
    )
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    if (response.status === statusCodes.notFound) {
      throw Boom.notFound(`Offer not found with ID ${agreementId}`)
    }
    if (
      response.status === statusCodes.unauthorized ||
      response.status === statusCodes.forbidden
    ) {
      throw Boom.unauthorized(
        'Your account is not authorised to view/accept this offer agreement'
      )
    }

    const responseText = await response.text().catch(() => '')

    let message = `Unable to ${method === 'GET' ? 'load' : 'update'} agreement.`

    try {
      const responseBody = JSON.parse(responseText)

      if (responseBody && typeof responseBody.errorMessage === 'string') {
        const shortError = responseBody.errorMessage.split('{')[0].trim()
        message += ` ${shortError}`
      } else {
        message += ` ${response.status} ${response.statusText}`
      }
    } catch {
      message += ` ${response.status} ${response.statusText}`
    }

    throw new Error(message, { cause: response })
  }

  return response.json()
}

const buildBackendUrl = ({
  agreementId,
  actionName,
  backend,
  currentAgreement,
  page
}) => {
  if (backend === 'gas') {
    if (currentAgreement) {
      const url = new URL(
        'agreements/current',
        `${config.get('gasBackend.url')}/`
      )
      url.searchParams.set('code', currentAgreement.code)
      url.searchParams.set('clientRef', currentAgreement.clientRef)
      url.searchParams.set('sbi', currentAgreement.sbi)

      return url.toString()
    }

    const url = new URL(
      `agreements/${agreementId}${actionName ? `/actions/${actionName}` : ''}`,
      `${config.get('gasBackend.url')}/`
    )

    if (page) {
      url.searchParams.set('page', page)
    }

    return url.toString()
  }

  return `${config.get('backend.url')}/${agreementId}`
}

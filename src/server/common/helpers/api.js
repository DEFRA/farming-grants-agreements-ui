import Boom from '@hapi/boom'

import { config } from '#~/config/config.js'
import { statusCodes } from '#~/server/common/constants/status-codes.js'
import { extractJwtPayload } from '#~/server/common/helpers/jwt-auth.js'

export const apiRequest = async ({
  agreementId,
  method = 'GET',
  auth,
  body,
  queryParams,
  actionName
}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(new Error('Network timed out while fetching data')),
    config.get('backend.timeout')
  )

  let url
  const headers = {
    'x-encrypted-auth': auth
  }

  const jwtPayload = auth ? extractJwtPayload(auth, console) : null
  const allowedGrantCodes = config.get('gasBackend.allowedGrantCodes')
  const backend = allowedGrantCodes.includes(jwtPayload?.grantCode) ? 'gas' : 'legacy'

  if (backend === 'gas') {
    const gasUrl = config.get('gasBackend.url')
    const gasAuthToken = config.get('gasBackend.authToken')

    if (gasAuthToken) {
      headers.Authorization = `Bearer ${gasAuthToken}`
    }

    if (method.toUpperCase() === 'GET') {
      const searchParams = new URLSearchParams(queryParams)

      if (jwtPayload?.grantCode) {
        searchParams.set('code', jwtPayload.grantCode)
      }

      if (jwtPayload?.clientRef) {
        searchParams.set('clientRef', jwtPayload.clientRef)
      }

      if (jwtPayload?.sbi) {
        searchParams.set('sbi', jwtPayload.sbi)
      }

      url = `${gasUrl}/agreements/current?${searchParams.toString()}`
    } else {
      url = `${gasUrl}/agreements/${agreementId}/actions/${actionName}`
    }
  } else {
    url = `${config.get('backend.url')}/${agreementId}`
  }

  let response
  try {
    console.log(`**************** Sending ${method} request to ${url}`)
    response = await fetch(url, {
      method,
      headers: {
        ...(method.toUpperCase() === 'GET'
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...headers
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal
    })
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

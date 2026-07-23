import Boom from '@hapi/boom'

import { config } from '#~/config/config.js'
import { statusCodes } from '#~/server/common/constants/status-codes.js'
import { createLogger } from '#~/server/common/helpers/logging/logger.js'

export const GAS = 'gas'
const LEGACY = 'legacy'
const logger = createLogger()

export const getBackend = (jwtPayload) => {
  const allowedGrantCodes = config.get('gasBackend.allowedGrantCodes')
  return allowedGrantCodes.includes(jwtPayload?.grantCode) ? GAS : LEGACY
}

const buildUrl = ({
  backend,
  agreementId,
  method,
  queryParams,
  actionName,
  jwtPayload
}) => {
  if (backend === GAS) {
    const gasUrl = config.get('gasBackend.url')
    if (method.toUpperCase() === 'GET') {
      const searchParams = new URLSearchParams(queryParams)
      const { grantCode, clientRef, sbi } = jwtPayload || {}

      searchParams.set('code', grantCode)
      searchParams.set('clientRef', clientRef)
      searchParams.set('sbi', sbi)

      return `${gasUrl}/agreements/current?${searchParams.toString()}`
    }
    return `${gasUrl}/agreements/${agreementId}/actions/${actionName}`
  }
  return `${config.get('backend.url')}/${agreementId}`
}

const getHeaders = ({ backend, auth, method }) => {
  const headers = {
    ...(backend === LEGACY && { 'x-encrypted-auth': auth }),
    ...(method.toUpperCase() === 'POST' && {
      'Content-Type': 'application/json'
    })
  }

  if (backend === GAS) {
    const gasAuthToken = config.get('gasBackend.authToken')
    if (gasAuthToken) {
      headers.Authorization = `Bearer ${gasAuthToken}`
    }
  }
  return headers
}

const handleError = async (response, agreementId, method) => {
  if (response.status === statusCodes.notFound) {
    throw Boom.notFound(`Offer not found with ID ${agreementId}`)
  }

  if (
    [statusCodes.unauthorized, statusCodes.forbidden].includes(response.status)
  ) {
    throw Boom.unauthorized(
      'Your account is not authorised to view/accept this offer agreement'
    )
  }

  const responseText = await response.text().catch(() => '')
  let message = `Unable to ${method === 'GET' ? 'load' : 'update'} agreement.`

  try {
    const responseBody = JSON.parse(responseText)
    const errorMessage = responseBody?.errorMessage
    if (typeof errorMessage === 'string') {
      message += ` ${errorMessage.split('{')[0].trim()}`
    } else {
      message += ` ${response.status} ${response.statusText}`
    }
  } catch {
    message += ` ${response.status} ${response.statusText}`
  }

  throw new Error(message, { cause: response })
}

export const apiRequest = async ({
  agreementId,
  method = 'GET',
  auth,
  body,
  queryParams,
  actionName,
  backend,
  jwtPayload
}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(new Error('Network timed out while fetching data')),
    config.get('backend.timeout')
  )

  if (!jwtPayload) {
    throw Boom.unauthorized(
      'Your account is not authorised to view/accept this offer agreement'
    )
  }

  const url = buildUrl({
    backend,
    agreementId,
    method,
    queryParams,
    actionName,
    jwtPayload
  })
  const headers = getHeaders({ backend, auth, method })

  try {
    logger.info(`Sending ${method} request to '${backend}' service: ${url}`)
    const response = await fetch(url, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
      signal: controller.signal
    })

    if (!response.ok) {
      await handleError(response, agreementId, method)
    }

    const data = await response.json()
    return { ...data, source: backend }
  } finally {
    clearTimeout(timeoutId)
  }
}

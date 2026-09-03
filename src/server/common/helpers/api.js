import Boom from '@hapi/boom'

import { config } from '#~/config/config.js'
import { statusCodes } from '#~/server/common/constants/status-codes.js'
import { createLogger } from '#~/server/common/helpers/logging/logger.js'

export const GAS = 'gas'
const LEGACY = 'legacy'
const LEGACY_AGREEMENT_NUMBER = /^(?:FPTT|WMP)\d+$/
const logger = createLogger()

export const getBackend = (jwtPayload, agreementNumber) => {
  const grantCode = jwtPayload?.grantCode

  if (typeof grantCode !== 'string' || !grantCode.trim()) {
    if (LEGACY_AGREEMENT_NUMBER.test(agreementNumber ?? '')) {
      return LEGACY
    }

    throw Boom.unauthorized('Agreement grant code is missing')
  }

  const allowedGrantCodes = config.get('gasBackend.allowedGrantCodes')
  return allowedGrantCodes.includes(grantCode) ? GAS : LEGACY
}

const appendQueryParams = (url, queryParams) => {
  const searchParams = new URLSearchParams()

  for (const [name, value] of Object.entries(queryParams ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      searchParams.append(name, item)
    }
  }

  const search = searchParams.toString()
  return search ? `${url}?${search}` : url
}

const buildGasGetUrl = (gasUrl, agreementId, queryParams) => {
  if (agreementId) {
    return appendQueryParams(
      `${gasUrl}/agreements/${encodeURIComponent(agreementId)}/document`,
      queryParams
    )
  }

  return appendQueryParams(`${gasUrl}/agreements/current`, queryParams)
}

const buildUrl = ({
  backend,
  agreementId,
  method,
  queryParams,
  actionName
}) => {
  if (backend === GAS) {
    const gasUrl = config.get('gasBackend.url')

    if (actionName) {
      return appendQueryParams(
        `${gasUrl}/agreements/${encodeURIComponent(agreementId)}/actions/${encodeURIComponent(actionName)}`,
        queryParams
      )
    }

    if (method.toUpperCase() === 'GET') {
      return buildGasGetUrl(gasUrl, agreementId, queryParams)
    }
    return `${gasUrl}/agreements/${agreementId}/actions/${actionName}`
  }
  return `${config.get('backend.url')}/${agreementId}`
}

const getGasAgreementHeaders = (jwtPayload = {}, includeClientRef = false) => ({
  ...(jwtPayload.source !== undefined && {
    'x-agreement-source': String(jwtPayload.source)
  }),
  ...(jwtPayload.grantCode !== undefined && {
    'x-agreement-code': String(jwtPayload.grantCode)
  }),
  ...(includeClientRef &&
    jwtPayload.clientRef !== undefined && {
      'x-agreement-client-ref': String(jwtPayload.clientRef)
    }),
  ...(jwtPayload.sbi !== undefined && {
    'x-agreement-sbi': String(jwtPayload.sbi)
  })
})

const getHeaders = ({
  backend,
  auth,
  method,
  agreementContext,
  includeClientRef,
  transportHeaders
}) => {
  const headers = {
    ...(backend === LEGACY && { 'x-encrypted-auth': auth }),
    // FGP-1307: forward the verified caller token to GAS (alongside the
    // existing service bearer and x-agreement-* headers) so GAS can verify the
    // caller independently. Additive/backwards-compatible for now.
    ...(backend === GAS && auth && { 'x-encrypted-auth': auth }),
    ...(backend === GAS &&
      getGasAgreementHeaders(agreementContext, includeClientRef)),
    ...(method.toUpperCase() === 'POST' && {
      'Content-Type': 'application/json'
    }),
    ...transportHeaders
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

const requestBackend = async (
  {
    agreementId,
    method = 'GET',
    auth,
    body,
    queryParams,
    actionName,
    backend = LEGACY,
    jwtPayload,
    transportHeaders
  },
  handleResponse
) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(new Error('Network timed out while fetching data')),
    config.get('backend.timeout')
  )

  try {
    const url = buildUrl({
      backend,
      agreementId,
      method,
      queryParams,
      actionName
    })
    const headers = getHeaders({
      backend,
      auth,
      method,
      agreementContext: jwtPayload,
      includeClientRef: !agreementId && !actionName,
      transportHeaders
    })

    logger.info(`Sending ${method} request to '${backend}' service: ${url}`)
    const response = await fetch(url, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
      signal: controller.signal,
      ...(backend === GAS && { redirect: 'manual' })
    })

    return await handleResponse(response)
  } finally {
    clearTimeout(timeoutId)
  }
}

export const apiRequest = async (request) =>
  requestBackend(request, async (response) => {
    const { agreementId, method = 'GET', backend = LEGACY } = request

    if (!response.ok) {
      await handleError(response, agreementId, method)
    }

    const data = await response.json()
    return { ...data, source: backend }
  })

export const gasActionRequest = async ({
  agreementId,
  actionName,
  method = 'GET',
  body,
  etag,
  idempotencyKey,
  queryParams,
  jwtPayload,
  auth
}) =>
  requestBackend(
    {
      agreementId,
      actionName,
      method,
      body,
      backend: GAS,
      jwtPayload,
      auth,
      queryParams,
      transportHeaders: {
        ...(etag !== undefined && { 'If-Match': etag }),
        ...(idempotencyKey !== undefined && {
          'Idempotency-Key': idempotencyKey
        })
      }
    },
    async (response) => {
      if (
        [statusCodes.seeOther, statusCodes.preconditionFailed].includes(
          response.status
        )
      ) {
        return {
          status: response.status,
          location: response.headers.get('location')
        }
      }

      if (response.ok || response.status === statusCodes.unprocessableEntity) {
        return {
          status: response.status,
          pageModel: await response.json(),
          etag: response.headers.get('etag')
        }
      }

      return handleError(response, agreementId, method)
    }
  )

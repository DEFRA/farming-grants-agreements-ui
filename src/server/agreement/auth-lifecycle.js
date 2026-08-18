import { createHash } from 'node:crypto'

import { encryptedAuthQueryName } from './agreement-request.js'

const lifecycleStages = ['onRequest', 'onPreAuth', 'onPostAuth', 'onPreHandler']

const fingerprint = (value) =>
  typeof value === 'string'
    ? createHash('sha256').update(value).digest('hex').slice(0, 16)
    : null

const countRawAuthHeaders = (request) => {
  const rawHeaders = request.raw?.req?.rawHeaders ?? []

  return rawHeaders.filter(
    (value, index) =>
      index % 2 === 0 && value.toLowerCase() === encryptedAuthQueryName
  ).length
}

const logAuthState = (stage, request) => {
  if (request.path !== '/') {
    return
  }

  const authToken = request.headers?.[encryptedAuthQueryName]

  request.logger.info(
    {
      stage,
      requestId: request.info.id,
      xCdpRequestId: request.headers?.['x-cdp-request-id'],
      hasAuthHeader: authToken !== undefined,
      authTokenType: typeof authToken,
      authTokenLength: typeof authToken === 'string' ? authToken.length : null,
      authTokenFingerprint: fingerprint(authToken),
      rawRequestHasAuthHeader:
        request.raw?.req?.headers?.[encryptedAuthQueryName] !== undefined,
      rawAuthHeaderCount: countRawAuthHeaders(request)
    },
    'Agreement JWT lifecycle'
  )
}

export const agreementAuthLifecycle = {
  plugin: {
    name: 'agreement-auth-lifecycle',
    register(server) {
      for (const stage of lifecycleStages) {
        server.ext(stage, (request, h) => {
          logAuthState(stage, request)
          return h.continue
        })
      }
    }
  }
}

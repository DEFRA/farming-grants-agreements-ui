import { config } from '#~/config/config.js'
import Jwt from '@hapi/jwt'
import { createLogger } from '#~/server/common/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Validates and verifies a JWT token against a secret to extract the payload
 * which will have the 'sbi' and 'source' data
 * @param {string} authToken - The JWT token to verify and decode
 * @returns {payload|null} The JWT payload object from the token or null if invalid/missing
 */
const extractJwtPayload = (authToken, requestLogger = logger) => {
  if (!authToken || authToken.trim() === '') {
    requestLogger.error('No JWT token provided')
    return null
  }

  requestLogger.info(
    {
      tokenLength: authToken.length,
      isJwtFormat: authToken.startsWith('eyJ') && authToken.includes('.')
    },
    'Attempting to decode JWT token'
  )

  try {
    const decoded = Jwt.token.decode(authToken)
    requestLogger.info(
      'JWT token decoded successfully, attempting verification'
    )

    // Verify the token against the secret
    Jwt.token.verify(decoded, {
      key: config.get('jwtSecret'),
      algorithms: ['HS256']
    })

    requestLogger.info('JWT token verified successfully')
    const payload = decoded?.decoded?.payload || null

    if (payload) {
      requestLogger.info(
        {
          hasSbi: !!payload.sbi,
          hasSource: !!payload.source,
          source: payload.source,
          clientRef: payload.clientRef,
          grantCode: payload.grantCode
        },
        'JWT payload extracted'
      )
    }

    return payload
  } catch (jwtError) {
    requestLogger.error(
      jwtError,
      `Invalid JWT token provided: ${jwtError.message}`
    )
    return null
  }
}

export { extractJwtPayload }

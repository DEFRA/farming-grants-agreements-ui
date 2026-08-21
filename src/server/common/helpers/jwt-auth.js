import { config } from '#~/config/config.js'
import Jwt from '@hapi/jwt'
import { createLogger } from '#~/server/common/helpers/logging/logger.js'

const logger = createLogger()

// FGP-1307: caller-token hardening. Producers now add registered claims
// (iss/aud/sub) and a short exp. We validate them in a backwards-compatible
// ("warn-only") mode: expiry is already enforced by Jwt.token.verify when an
// exp claim is present, while missing/mismatched iss/aud/sub are logged but not
// rejected so legacy tokens keep working until enforcement lands.
const EXPECTED_AUDIENCE = 'agreements-ui'

const warnOnCallerClaims = (payload) => {
  const missing = ['iss', 'aud', 'sub'].filter(
    (claim) => payload[claim] == null
  )
  if (missing.length > 0) {
    logger.warn(
      { missingClaims: missing },
      'Caller token is missing hardened claims (FGP-1307); accepted for now'
    )
  }

  const { aud } = payload
  const audienceMatches =
    aud === EXPECTED_AUDIENCE ||
    (Array.isArray(aud) && aud.includes(EXPECTED_AUDIENCE))
  if (aud != null && !audienceMatches) {
    logger.warn(
      { aud },
      'Caller token audience does not include agreements-ui (FGP-1307); accepted for now'
    )
  }
}

/**
 * Validates and verifies a JWT token against a secret to extract the payload
 * which will have the 'sbi' and 'source' data
 * @param {string} authToken - The JWT token to verify and decode
 * @returns {payload|null} The JWT payload object from the token or null if invalid/missing
 */
const extractJwtPayload = (authToken) => {
  if (!authToken || authToken.trim() === '') {
    logger.error('No JWT token provided')
    return null
  }

  logger.info(
    {
      tokenLength: authToken.length,
      isJwtFormat: authToken.startsWith('eyJ') && authToken.includes('.')
    },
    'Attempting to decode JWT token'
  )

  try {
    const decoded = Jwt.token.decode(authToken)
    logger.info('JWT token decoded successfully, attempting verification')

    // Verify the token against the secret
    Jwt.token.verify(decoded, {
      key: config.get('jwtSecret'),
      algorithms: ['HS256']
    })

    logger.info('JWT token verified successfully')
    const payload = decoded?.decoded?.payload || null

    if (payload) {
      warnOnCallerClaims(payload)
      logger.info(
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
    logger.error(jwtError, `Invalid JWT token provided: ${jwtError.message}`)
    return null
  }
}

export { extractJwtPayload }

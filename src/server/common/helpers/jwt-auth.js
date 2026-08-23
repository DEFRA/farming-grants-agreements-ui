import { config } from '#~/config/config.js'
import Jwt from '@hapi/jwt'
import { createLogger } from '#~/server/common/helpers/logging/logger.js'

const logger = createLogger()

// FGP-1307: caller-token hardening. Producers now add registered claims
// (iss/aud/sub) and a short iat/exp. We validate them in a backwards-compatible
// ("warn-only") mode: expiry is already enforced by Jwt.token.verify when an
// exp claim is present, while a missing exp/iat, a non-numeric iat, a token
// lifetime (exp - iat) outside the agreed range, missing/mismatched iss/aud/sub,
// or an issuer outside the agreed producer allowlist are logged but not rejected
// so legacy tokens keep working until enforcement lands.
const EXPECTED_AUDIENCE = 'agreements-ui'

const missingClaimsWarning = (payload) => {
  const missing = ['iss', 'aud', 'sub', 'exp', 'iat'].filter(
    (claim) => payload[claim] == null
  )
  return missing.length > 0
    ? {
        data: { missingClaims: missing },
        message:
          'Caller token is missing hardened claims (FGP-1307); accepted for now'
      }
    : null
}

const lifetimeWarning = (payload) => {
  const { iat, exp } = payload
  if (iat != null && typeof iat !== 'number') {
    return {
      data: { iatType: typeof iat },
      message:
        'Caller token iat is not a numeric claim (FGP-1307); accepted for now'
    }
  }
  if (typeof iat !== 'number' || typeof exp !== 'number') {
    return null
  }
  const lifetimeSeconds = exp - iat
  const maxLifetimeSeconds = config.get('callerTokenMaxLifetimeSeconds')
  return lifetimeSeconds <= 0 || lifetimeSeconds > maxLifetimeSeconds
    ? {
        data: { lifetimeSeconds, maxLifetimeSeconds },
        message:
          'Caller token lifetime (exp - iat) is outside the agreed range (FGP-1307); accepted for now'
      }
    : null
}

const audienceWarning = (payload) => {
  const { aud } = payload
  const audienceMatches =
    aud === EXPECTED_AUDIENCE ||
    (Array.isArray(aud) && aud.includes(EXPECTED_AUDIENCE))
  return aud != null && !audienceMatches
    ? {
        data: { aud },
        message:
          'Caller token audience does not include agreements-ui (FGP-1307); accepted for now'
      }
    : null
}

const issuerWarning = (payload) => {
  const { iss } = payload
  const allowedIssuers = config.get('callerTokenAllowedIssuers') || []
  return iss != null &&
    allowedIssuers.length > 0 &&
    !allowedIssuers.includes(iss)
    ? {
        data: { iss },
        message:
          'Caller token issuer is not in the allowed producers list (FGP-1307); accepted for now'
      }
    : null
}

const warnOnCallerClaims = (payload) => {
  const checks = [
    missingClaimsWarning,
    lifetimeWarning,
    audienceWarning,
    issuerWarning
  ]
  for (const check of checks) {
    const warning = check(payload)
    if (warning) {
      logger.warn(warning.data, warning.message)
    }
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
          hasClientRef: !!payload.clientRef,
          hasGrantCode: !!payload.grantCode
        },
        'JWT payload extracted'
      )
    }

    return payload
  } catch (jwtError) {
    // FGP-1307: never pass the raw error or authToken to the logger. @hapi/jwt
    // decode errors can carry token artifacts (artifacts.token, raw segments,
    // decoded payload) which pino-pretty would serialise. Log only explicitly
    // selected, non-sensitive fields.
    logger.error(
      {
        errorType: jwtError?.name ?? 'Error',
        errorMessage: jwtError?.message
      },
      'Invalid JWT token provided'
    )
    return null
  }
}

export { extractJwtPayload }

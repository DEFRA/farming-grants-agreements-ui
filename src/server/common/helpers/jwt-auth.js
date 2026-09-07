import { config } from '#~/config/config.js'
import Jwt from '@hapi/jwt'
import { createLogger } from '#~/server/common/helpers/logging/logger.js'

const logger = createLogger()

// FGP-1307: caller-token hardening — enforcement stage. Producers add registered
// claims (iss/aud/sub) and a short iat/exp, and stamp a `kid` in the header so the
// verifying key can be selected from a keyring (supporting rotation via overlap).
// When `callerTokenEnforce` is true, a missing exp/iat, a non-numeric iat, a token
// lifetime (exp - iat) outside the agreed range, missing/mismatched iss/aud/sub, an
// issuer outside the agreed producer allowlist, or an unknown/unverifiable kid cause
// the token to be REJECTED. When it is false the same conditions are logged but the
// token is still accepted (backwards-compatible warn-only mode).
const EXPECTED_AUDIENCE = 'agreements-ui'

// FGP-1307: the agreed caller-token lifetime is a fixed security rule (a short,
// single-request token). It is a code constant rather than configuration so it
// cannot drift between environments.
const MAX_CALLER_TOKEN_LIFETIME_SECONDS = 300

const ALLOWED_ISSUERS = Object.freeze([
  'grants-ui',
  'fg-cw-frontend',
  'agreements-pdf'
])

// FGP-1307: resolve the HS256 secret used to verify a caller token from its `kid`.
// A token with no kid (e.g. grants-ui, which is intentionally left as-is for now)
// maps to the default secret; a kid equal to the configured default kid also maps
// to the default secret; any other kid must be present in the keyring, otherwise
// the token cannot be verified and is rejected. This keeps a single pinned default
// secret working while allowing rotation of additional keys via kid overlap.
const resolveVerificationSecret = (kid) => {
  const defaultSecret = config.get('jwtSecret')
  const defaultKid = config.get('jwtDefaultKid')

  if (kid == null || kid === defaultKid) {
    return defaultSecret
  }

  const keyring = config.get('jwtKeyring') || {}
  return keyring[kid] ?? null
}

const missingClaimsIssue = (payload) => {
  const missing = ['iss', 'aud', 'sub', 'exp', 'iat'].filter(
    (claim) => payload[claim] == null
  )
  return missing.length > 0
    ? {
        data: { missingClaims: missing },
        reason: 'Caller token is missing hardened claims (FGP-1307)'
      }
    : null
}

const lifetimeIssue = (payload) => {
  const { iat, exp } = payload
  if (iat != null && typeof iat !== 'number') {
    return {
      data: { iatType: typeof iat },
      reason: 'Caller token iat is not a numeric claim (FGP-1307)'
    }
  }
  if (typeof iat !== 'number' || typeof exp !== 'number') {
    return null
  }
  const lifetimeSeconds = exp - iat
  const maxLifetimeSeconds = MAX_CALLER_TOKEN_LIFETIME_SECONDS
  return lifetimeSeconds <= 0 || lifetimeSeconds > maxLifetimeSeconds
    ? {
        data: { lifetimeSeconds, maxLifetimeSeconds },
        reason:
          'Caller token lifetime (exp - iat) is outside the agreed range (FGP-1307)'
      }
    : null
}

const audienceIssue = (payload) => {
  const { aud } = payload
  const audienceMatches =
    aud === EXPECTED_AUDIENCE ||
    (Array.isArray(aud) && aud.includes(EXPECTED_AUDIENCE))
  return aud != null && !audienceMatches
    ? {
        data: { aud },
        reason:
          'Caller token audience does not include agreements-ui (FGP-1307)'
      }
    : null
}

const issuerIssue = (payload) => {
  const { iss } = payload
  return iss != null && !ALLOWED_ISSUERS.includes(iss)
    ? {
        data: { iss },
        reason:
          'Caller token issuer is not in the allowed producers list (FGP-1307)'
      }
    : null
}

const collectCallerClaimIssues = (payload) => {
  const checks = [missingClaimsIssue, lifetimeIssue, audienceIssue, issuerIssue]
  return checks.map((check) => check(payload)).filter(Boolean)
}

// FGP-1307: decode a caller token, select the verifying secret from its `kid`
// (so keys can be rotated via overlap; no kid maps to the default secret) and
// verify the signature. Returns the payload, or null when the kid is unknown.
const decodeAndVerifyCallerToken = (authToken) => {
  const decoded = Jwt.token.decode(authToken)
  logger.info('JWT token decoded successfully, attempting verification')

  const kid = decoded?.decoded?.header?.kid
  const secret = resolveVerificationSecret(kid)
  if (!secret) {
    logger.error(
      { kid },
      'Caller token kid is not in the verification keyring (FGP-1307)'
    )
    return null
  }

  // Verify the token against the selected secret (also enforces exp when present)
  Jwt.token.verify(decoded, {
    key: secret,
    algorithms: ['HS256']
  })

  logger.info('JWT token verified successfully')
  return decoded?.decoded?.payload || null
}

// FGP-1307: log any hardened-claim issues and report whether the token must be
// rejected. In warn-only mode (enforce false) issues are logged but accepted.
const shouldRejectCallerClaims = (payload) => {
  const issues = collectCallerClaimIssues(payload)
  if (issues.length === 0) {
    return false
  }

  const enforce = config.get('callerTokenEnforce')
  for (const issue of issues) {
    logger.warn(
      issue.data,
      enforce
        ? `${issue.reason}; rejected`
        : `${issue.reason}; accepted for now`
    )
  }
  return enforce
}

// FGP-1307: classify a caught JWT error into a coarse, non-sensitive category so
// operators can tell whether the failure was a bad signature, an expired token,
// or a structural/decoding problem — without logging any token material.
const classifyJwtFailure = (error) => {
  const message = (error?.message ?? '').toLowerCase()
  if (message.includes('expired')) {
    return 'expired'
  }
  if (message.includes('signature')) {
    return 'signature'
  }
  if (
    message.includes('format') ||
    message.includes('decode') ||
    message.includes('invalid token') ||
    message.includes('structure') ||
    error?.name === 'TokenError'
  ) {
    return 'structure'
  }
  return 'unknown'
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
    const payload = decodeAndVerifyCallerToken(authToken)

    if (payload) {
      if (shouldRejectCallerClaims(payload)) {
        return null
      }

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
    // selected, non-sensitive fields — including a coarse failure category so
    // operators can distinguish signature/expiry/structural failures.
    logger.error(
      {
        errorType: jwtError?.name ?? 'Error',
        errorMessage: jwtError?.message,
        failureCategory: classifyJwtFailure(jwtError)
      },
      'Invalid JWT token provided'
    )
    return null
  }
}

export { extractJwtPayload }

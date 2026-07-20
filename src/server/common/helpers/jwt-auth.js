import { config } from '#~/config/config.js'
import Jwt from '@hapi/jwt'

/**
 * Validates and verifies a JWT token against a secret to extract the payload
 * which will have the 'sbi' and 'source' data
 * @param {string} authToken - The JWT token to verify and decode
 * @param {object} logger - Logger instance for error reporting
 * @returns {payload|null} The JWT payload object from the token or null if invalid/missing
 */
const extractJwtPayload = (authToken, logger) => {
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

// const validateJwtAuthentication = (authToken, agreementData, logger) => {
//   const isJwtEnabled = config.get('featureFlags.isJwtEnabled')
//
//   if (!isJwtEnabled) {
//     if (!agreementData) {
//       throw new Error(
//         'Bad request, Neither JWT is enabled nor agreementId is provided'
//       )
//     }
//     logger.warn('JWT authentication is disabled via feature flag')
//     return { valid: true, source: null, sbi: null }
//   }
//
//   if (!authToken) {
//     throw new Error(
//       'Bad request, JWT is enabled but no auth token provided in the header'
//     )
//   }
//
//   logger.info('**************8 Validating JWT authentication ****************8')
//
//   const jwtPayload = extractJwtPayload(authToken, logger)
//   if (!jwtPayload) {
//     logger.info('JWT payload extraction failed')
//     return { valid: false, source: null, sbi: null }
//   }
//
//   const { sbi: jwtSbi, source } = jwtPayload
//   const agreementSbi = agreementData?.identifiers?.sbi
//
//   // SBI is valid if it matches or if it's not present in agreementData
//   // Entra source is always valid for now
//   const isValidSbi =
//     source === 'entra' ||
//     !agreementSbi ||
//     String(jwtSbi) === String(agreementSbi)
//   const isValidSource = ['defra', 'entra'].includes(source)
//
//   const authData = {
//     valid: isValidSbi && isValidSource,
//     source,
//     sbi: jwtSbi
//   }
//
//   logger.info(JSON.stringify(authData), 'JWT payload extracted successfully')
//
//   return authData
// }

export { extractJwtPayload }

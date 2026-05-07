import Boom from '@hapi/boom'
import { fptt } from './fptt/index.js'
import { wmp } from './wmp/index.js'

const grantsByCode = {
  'frps-private-beta': fptt,
  woodland: wmp
}

/**
 * Retrieves the grant-type configuration for a given agreement.
 * @param {object} agreementData - The agreement data object.
 * @returns {object} The grant-type configuration.
 * @throws {Boom.badRequest} If the agreement code is unsupported.
 */
export const getGrantTypeFor = (agreementData = {}) => {
  const grant = grantsByCode[agreementData.code]

  if (!grant) {
    throw Boom.badRequest(`Unsupported agreement code: ${agreementData.code}`)
  }

  return grant
}

import { statusCodes } from '../common/constants/status-codes.js'
import { config } from '../../config/config.js'

/**
 * A generic health-check endpoint. Used by the platform to check if the service is up and handling requests.
 */
export const healthController = {
  handler(request, h) {
    return h
      .response({
        message: 'success',
        version: config.get('serviceVersion')
      })
      .code(statusCodes.ok)
  }
}

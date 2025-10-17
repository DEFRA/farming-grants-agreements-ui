import { agreementController } from './controller.js'

/**
 * Sets up the routes used in the agreement page.
 * These routes are registered in src/server/router.js.
 */
export const agreement = {
  plugin: {
    name: 'agreement',
    register(server) {
      server.route([
        {
          method: ['GET', 'POST'],
          path: '/{agreementId}',
          ...agreementController
        }
      ])
    }
  }
}

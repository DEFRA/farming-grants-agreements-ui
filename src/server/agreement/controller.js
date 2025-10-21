import Boom from '@hapi/boom'

import { getControllerByAction } from '../common/helpers/get-controller-by-action.js'

export const agreementController = {
  /**
   * @param {import('@hapi/hapi').Request & { pre: { agreementData: Agreement } }} request
   * @param {import('@hapi/hapi').ResponseToolkit} h
   */
  handler: (request, h) => {
    const action = request.payload?.action
    const { agreementData } = request.pre?.data

    const controller = getControllerByAction(agreementData.status)(action)
    if (!controller?.handler) {
      throw Boom.badRequest(
        `Unrecognised action in POST payload: ${String(action)}`
      )
    }

    // Delegate to chosen controller handler
    return controller.handler(request, h)
  }
}

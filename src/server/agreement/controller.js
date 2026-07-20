import Boom from '@hapi/boom'

import { getControllerByAction } from '#~/server/common/helpers/get-controller-by-action.js'
import { configDrivenAgreementController } from '#~/server/config-driven-agreement/controller.js'

export const agreementController = {
  /**
   * @param {import('@hapi/hapi').Request & { pre: { agreementData: Agreement } }} request
   * @param {import('@hapi/hapi').ResponseToolkit} h
   */
  handler: (request, h) => {
    if (request.pre?.data?.source === 'gas') {
      request.log(
        ['info', 'agreement'],
        '************** Delegating to config-driven agreement controller'
      )
      return configDrivenAgreementController.handler(request, h)
    }

    const action = request.payload?.action
    const { agreementData } = request.pre?.data || {}

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

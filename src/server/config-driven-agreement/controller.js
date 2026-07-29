import { getBaseUrl } from '#~/server/common/helpers/base-url.js'

import { buildViewModel } from './build-view-model.js'
import { validateComponents } from './validate-components.js'

export const configDrivenAgreementController = {
  handler(request, h) {
    const renderModel = request.pre?.data ?? {}
    const components = renderModel.components ?? renderModel.content ?? []

    validateComponents(components, request.logger)

    return h.view(
      'config-driven-agreement/page',
      buildViewModel(renderModel, getBaseUrl(request))
    )
  }
}

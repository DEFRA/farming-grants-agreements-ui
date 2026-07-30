import { getBaseUrl } from '#~/server/common/helpers/base-url.js'
import { getQueryAuthentication } from '#~/server/agreement/agreement-request.js'

import { buildViewModel } from './build-view-model.js'
import { validateComponents } from './validate-components.js'

const getBuildOptions = (request, transportMetadata) => {
  const queryAuthentication = getQueryAuthentication(request)

  return queryAuthentication === undefined && transportMetadata === undefined
    ? undefined
    : { queryAuthentication, transportMetadata }
}

export const renderConfigDrivenAgreement = (
  request,
  h,
  renderModel,
  transportMetadata
) => {
  const resolvedRenderModel = renderModel ?? {}
  const components =
    resolvedRenderModel.components ?? resolvedRenderModel.content ?? []
  validateComponents(components, request.logger)

  const baseUrl = getBaseUrl(request)
  const buildOptions = getBuildOptions(request, transportMetadata)
  const viewModel = buildOptions
    ? buildViewModel(resolvedRenderModel, baseUrl, buildOptions)
    : buildViewModel(resolvedRenderModel, baseUrl)

  return h.view('config-driven-agreement/page', viewModel)
}

export const configDrivenAgreementController = {
  handler(request, h) {
    return renderConfigDrivenAgreement(request, h, request.pre?.data)
  }
}

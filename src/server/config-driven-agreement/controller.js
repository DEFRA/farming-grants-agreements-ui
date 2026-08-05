import { getBaseUrl } from '#~/server/common/helpers/base-url.js'
import { getQueryAuthentication } from '#~/server/agreement/agreement-request.js'

import { buildViewModel } from './build-view-model.js'
import { validateComponents } from './validate-components.js'

export const renderConfigDrivenAgreement = (
  request,
  h,
  renderModel,
  transportMetadata
) => {
  const resolvedRenderModel = renderModel ?? {}
  const components =
    resolvedRenderModel.components ?? resolvedRenderModel.content ?? []
  const sectionComponents = (resolvedRenderModel.sections ?? []).flatMap(
    (section) => section.components ?? []
  )
  validateComponents([...components, ...sectionComponents], request.logger)

  const baseUrl = getBaseUrl(request)
  const queryAuthentication = getQueryAuthentication(request)
  const viewModel = buildViewModel(resolvedRenderModel, baseUrl, {
    queryAuthentication,
    transportMetadata
  })

  return h
    .view('config-driven-agreement/page', viewModel)
    .header('Referrer-Policy', 'no-referrer')
}

export const configDrivenAgreementController = {
  handler(request, h) {
    return renderConfigDrivenAgreement(request, h, request.pre?.data)
  }
}

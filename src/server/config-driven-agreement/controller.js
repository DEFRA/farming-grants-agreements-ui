import path from 'node:path'

import { getBaseUrl } from '#~/server/common/helpers/base-url.js'

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i

const buildProxiedPath = (baseUrl, value) => {
  if (!value || absoluteUrlPattern.test(value) || value.startsWith('#')) {
    return value
  }

  if (
    baseUrl !== '/' &&
    (value === baseUrl || value.startsWith(`${baseUrl}/`))
  ) {
    return value
  }

  return path.posix.join(baseUrl, value)
}

const buildActions = (actions = [], baseUrl = '/') =>
  actions.map((action) => ({
    ...action,
    ...(action.href ? { href: buildProxiedPath(baseUrl, action.href) } : {}),
    ...(action.action
      ? { action: buildProxiedPath(baseUrl, action.action) }
      : {})
  }))

const hasWatermark = (components = []) =>
  components.some((component) => component?.component === 'watermark')

const buildConfigDrivenAgreementModel = (renderModel = {}, baseUrl = '/') => {
  const components = renderModel.components ?? renderModel.content ?? []

  return {
    pageTitle: renderModel.page?.title ?? renderModel.title ?? 'Agreement',
    agreement: renderModel.agreement,
    components,
    actions: buildActions(renderModel.actions, baseUrl),
    errors: renderModel.errors ?? [],
    hasWatermark: hasWatermark(components),
    layout: renderModel.page?.layout ?? renderModel.layout ?? 'default'
  }
}

export const configDrivenAgreementController = {
  handler(request, h) {
    const renderModel = request.pre?.data

    return h.view(
      'config-driven-agreement/page',
      buildConfigDrivenAgreementModel(renderModel, getBaseUrl(request))
    )
  }
}

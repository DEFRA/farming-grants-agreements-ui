import path from 'node:path'

import { getBaseUrl } from '#~/server/common/helpers/base-url.js'
import {
  appendQueryAuthentication,
  translateAgreementPath
} from '#~/server/agreement/agreement-paths.js'
import { getQueryAuthentication } from '#~/server/agreement/agreement-request.js'

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i

const buildProxiedPath = (baseUrl, value, queryAuthentication) => {
  if (!value || value.startsWith('#')) {
    return value
  }

  const translatedAgreementPath = translateAgreementPath(
    value,
    baseUrl,
    queryAuthentication
  )
  if (translatedAgreementPath) {
    return translatedAgreementPath
  }

  if (absoluteUrlPattern.test(value) || value.startsWith('//')) {
    return value
  }

  if (
    baseUrl !== '/' &&
    (value === baseUrl || value.startsWith(`${baseUrl}/`))
  ) {
    return appendQueryAuthentication(value, queryAuthentication)
  }

  return appendQueryAuthentication(
    path.posix.join(baseUrl, value),
    queryAuthentication
  )
}

const buildActions = (
  actions = [],
  baseUrl = '/',
  queryAuthentication
) =>
  actions.map((action) => ({
    ...action,
    ...(action.href
      ? {
          href: buildProxiedPath(
            baseUrl,
            action.href,
            queryAuthentication
          )
        }
      : {}),
    ...(action.action
      ? {
          action: buildProxiedPath(
            baseUrl,
            action.action,
            queryAuthentication
          )
        }
      : {})
  }))

const hasWatermark = (components = []) =>
  components.some((component) => component?.component === 'watermark')

const buildConfigDrivenAgreementModel = (
  renderModel = {},
  baseUrl = '/',
  transportMetadata,
  queryAuthentication
) => {
  const components = renderModel.components ?? renderModel.content ?? []

  return {
    pageTitle: renderModel.page?.title ?? renderModel.title ?? 'Agreement',
    agreement: renderModel.agreement,
    components,
    actions: buildActions(
      renderModel.actions,
      baseUrl,
      queryAuthentication
    ),
    errors: renderModel.errors ?? [],
    hasWatermark: hasWatermark(components),
    layout: renderModel.page?.layout ?? renderModel.layout ?? 'default',
    transportMetadata
  }
}

export const renderConfigDrivenAgreement = (
  request,
  h,
  renderModel,
  transportMetadata
) =>
  h.view(
    'config-driven-agreement/page',
    buildConfigDrivenAgreementModel(
      renderModel,
      getBaseUrl(request),
      transportMetadata,
      getQueryAuthentication(request)
    )
  )

export const configDrivenAgreementController = {
  handler(request, h) {
    return renderConfigDrivenAgreement(request, h, request.pre?.data)
  }
}

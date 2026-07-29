import path from 'node:path'

import Boom from '@hapi/boom'

import {
  appendQueryAuthentication,
  translateAgreementPath
} from '#~/server/agreement/agreement-paths.js'

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i

const buildProxiedPath = (baseUrl, value, queryAuthentication) => {
  if (typeof value !== 'string' || !value || value.startsWith('#')) {
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

const buildActionHref = (baseUrl, href, queryAuthentication) => {
  if (typeof href !== 'string' || !href) {
    throw Boom.badGateway('Unsupported agreement action URL')
  }

  const translatedAgreementPath = translateAgreementPath(
    href,
    baseUrl,
    queryAuthentication
  )
  if (translatedAgreementPath) {
    return translatedAgreementPath
  }

  if (absoluteUrlPattern.test(href) || href.startsWith('//')) {
    return href
  }

  throw Boom.badGateway('Unsupported agreement action URL')
}

const translateActionPaths = (
  actions = [],
  baseUrl = '/',
  queryAuthentication
) =>
  actions.map((action) => ({
    ...action,
    ...(Object.hasOwn(action, 'href')
      ? {
          href: buildActionHref(baseUrl, action.href, queryAuthentication)
        }
      : {}),
    ...(action.action
      ? {
          action: buildProxiedPath(baseUrl, action.action, queryAuthentication)
        }
      : {})
  }))

const buildComponentUrls = (value, baseUrl, queryAuthentication) => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      buildComponentUrls(item, baseUrl, queryAuthentication)
    )
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const transformedValue = Object.fromEntries(
    Object.entries(value).map(([name, childValue]) => [
      name,
      buildComponentUrls(childValue, baseUrl, queryAuthentication)
    ])
  )

  if (transformedValue.component !== 'url') {
    return transformedValue
  }

  const urlParams =
    transformedValue.params &&
    typeof transformedValue.params === 'object' &&
    !Array.isArray(transformedValue.params)
      ? transformedValue.params
      : transformedValue

  if (!urlParams.href) {
    return transformedValue
  }

  const href = buildProxiedPath(baseUrl, urlParams.href, queryAuthentication)

  return urlParams === transformedValue
    ? { ...transformedValue, href }
    : { ...transformedValue, params: { ...urlParams, href } }
}

const hasWatermark = (components = []) =>
  components.some((component) => component?.component === 'watermark')

export const buildViewModel = (
  renderModel = {},
  baseUrl = '/',
  { queryAuthentication, transportMetadata } = {}
) => {
  const components = renderModel.components ?? renderModel.content ?? []

  return {
    pageTitle: renderModel.page?.title ?? renderModel.title ?? 'Agreement',
    agreement: renderModel.agreement,
    components: buildComponentUrls(components, baseUrl, queryAuthentication),
    actions: translateActionPaths(
      renderModel.actions,
      baseUrl,
      queryAuthentication
    ),
    errors: renderModel.errors ?? [],
    hasWatermark: hasWatermark(components),
    layout: renderModel.page?.layout ?? renderModel.layout ?? 'default',
    ...(transportMetadata && { transportMetadata })
  }
}

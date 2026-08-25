import path from 'node:path'

import Boom from '@hapi/boom'

import {
  appendQueryAuthentication,
  translateAgreementPath
} from '#~/server/agreement/agreement-paths.js'

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i
const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:'])
const unsupportedActionUrlMessage = 'Unsupported agreement action URL'

const isAbsoluteUrl = (value) =>
  absoluteUrlPattern.test(value) || value.startsWith('//')

const shouldPreservePath = (value) =>
  typeof value !== 'string' || !value || value.startsWith('#')

const isWithinBaseUrl = (value, baseUrl) =>
  baseUrl !== '/' && (value === baseUrl || value.startsWith(`${baseUrl}/`))

const isAllowedExternalUrl = (value) => {
  if (!absoluteUrlPattern.test(value)) {
    return false
  }

  try {
    return allowedExternalProtocols.has(new URL(value).protocol)
  } catch {
    return false
  }
}

const returnAllowedExternalUrl = (value) => {
  if (isAllowedExternalUrl(value)) {
    return value
  }

  throw Boom.badGateway('Unsupported agreement URL')
}

const buildProxiedPath = (baseUrl, value, queryAuthentication) => {
  if (shouldPreservePath(value)) {
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

  if (isAbsoluteUrl(value)) {
    return returnAllowedExternalUrl(value)
  }

  if (isWithinBaseUrl(value, baseUrl)) {
    return appendQueryAuthentication(value, queryAuthentication)
  }

  return appendQueryAuthentication(
    path.posix.join(baseUrl, value),
    queryAuthentication
  )
}

const buildActionHref = (baseUrl, href, queryAuthentication, allowExternal) => {
  if (typeof href !== 'string' || !href) {
    throw Boom.badGateway(unsupportedActionUrlMessage)
  }

  const translatedAgreementPath = translateAgreementPath(
    href,
    baseUrl,
    queryAuthentication
  )
  if (translatedAgreementPath) {
    return translatedAgreementPath
  }

  if (allowExternal && isAbsoluteUrl(href)) {
    return returnAllowedExternalUrl(href)
  }

  throw Boom.badGateway(unsupportedActionUrlMessage)
}

const appendTransportFields = (fields, transportMetadata) => [
  ...(fields ?? []),
  ...(transportMetadata === undefined
    ? []
    : [transportMetadata.etag, transportMetadata.idempotencyKey])
]

const buildUrlComponent = (component, baseUrl, queryAuthentication) => {
  const urlParams = component.params ?? component
  const href = urlParams.href

  if (!href) {
    return component
  }

  const rewrittenHref = buildProxiedPath(baseUrl, href, queryAuthentication)

  return urlParams === component
    ? { ...component, href: rewrittenHref }
    : { ...component, params: { ...urlParams, href: rewrittenHref } }
}

const buildActionComponent = (
  component,
  baseUrl,
  queryAuthentication,
  transportMetadata
) => {
  if (component.component === 'form') {
    return {
      ...component,
      formAction: buildActionHref(
        baseUrl,
        component.formAction,
        queryAuthentication,
        false
      ),
      hiddenFields: appendTransportFields(
        component.hiddenFields,
        transportMetadata
      )
    }
  }

  if (component.component === 'button' && component.href) {
    return {
      ...component,
      href: buildActionHref(baseUrl, component.href, queryAuthentication, true)
    }
  }

  return component.component === 'url'
    ? buildUrlComponent(component, baseUrl, queryAuthentication)
    : component
}

const buildComponentUrls = (
  value,
  baseUrl,
  queryAuthentication,
  transportMetadata
) => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      buildComponentUrls(item, baseUrl, queryAuthentication, transportMetadata)
    )
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const component = Object.fromEntries(
    Object.entries(value).map(([name, childValue]) => [
      name,
      buildComponentUrls(
        childValue,
        baseUrl,
        queryAuthentication,
        transportMetadata
      )
    ])
  )

  return buildActionComponent(
    component,
    baseUrl,
    queryAuthentication,
    transportMetadata
  )
}

const buildSections = (
  sections,
  baseUrl,
  queryAuthentication,
  transportMetadata
) =>
  sections.map((section) => ({
    ...section,
    components: buildComponentUrls(
      section.components ?? [],
      baseUrl,
      queryAuthentication,
      transportMetadata
    )
  }))

const buildPageViewModel = (renderModel, page) => ({
  pageTitle: page.title ?? renderModel.title ?? 'Agreement',
  showContents: page.contents ?? false,
  print: page.print ?? false,
  watermark: page.watermark,
  layout: page.layout ?? renderModel.layout ?? 'default'
})

export const buildViewModel = (
  renderModel = {},
  baseUrl = '/',
  { queryAuthentication, transportMetadata } = {}
) => {
  const page = renderModel.page ?? {}

  return {
    ...buildPageViewModel(renderModel, page),
    agreement: renderModel.agreement,
    components: buildComponentUrls(
      renderModel.components ?? [],
      baseUrl,
      queryAuthentication,
      transportMetadata
    ),
    sections: buildSections(
      renderModel.sections ?? [],
      baseUrl,
      queryAuthentication,
      transportMetadata
    ),
    errors: renderModel.errors ?? []
  }
}

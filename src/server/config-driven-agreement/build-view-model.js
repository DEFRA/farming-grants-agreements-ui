import path from 'node:path'

import Boom from '@hapi/boom'

import {
  appendQueryAuthentication,
  translateAgreementPath
} from '#~/server/agreement/agreement-paths.js'

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i
const allowedExternalProtocols = new Set(['http:', 'https:', 'mailto:'])
const unsupportedActionUrlMessage = 'Unsupported agreement action URL'
const actionsSlot = 'actions'

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

const buildProxiedPath = (
  baseUrl,
  value,
  queryAuthentication,
  allowExternal = true
) => {
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
    if (!allowExternal) {
      throw Boom.badGateway(unsupportedActionUrlMessage)
    }
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

const buildActionHref = (baseUrl, href, method, queryAuthentication) => {
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

  if (isAbsoluteUrl(href)) {
    if (method === 'POST') {
      throw Boom.badGateway(unsupportedActionUrlMessage)
    }
    return returnAllowedExternalUrl(href)
  }

  throw Boom.badGateway(unsupportedActionUrlMessage)
}

const translateActionPaths = (actions, baseUrl, queryAuthentication) =>
  actions.map((action) => {
    const translatedAction = {
      ...action,
      ...(Object.hasOwn(action, 'href')
        ? {
            href: buildActionHref(
              baseUrl,
              action.href,
              action.method,
              queryAuthentication
            )
          }
        : {}),
      ...(action.action
        ? {
            action: buildProxiedPath(
              baseUrl,
              action.action,
              queryAuthentication,
              action.method !== 'POST'
            )
          }
        : {})
    }

    return {
      ...translatedAction,
      renderAsForm: !translatedAction.href || translatedAction.method === 'POST'
    }
  })

const validateActionForm = (actions) => {
  const formActions = actions.filter((action) => action.renderAsForm)
  const [formAction] = formActions
  const hasExactlyOnePostForm =
    formActions.length === 1 && formAction.method === 'POST'

  if (!hasExactlyOnePostForm) {
    throw Boom.badGateway('GAS action page must contain exactly one POST form')
  }
}

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

const getComponents = (renderModel) =>
  renderModel.components ?? renderModel.content ?? []

const containsActionsSlot = (value) => {
  if (!value || typeof value !== 'object') {
    return false
  }

  if (value.component === actionsSlot) {
    return true
  }

  return Object.values(value).some(containsActionsSlot)
}

const validateActionsSlot = (components, sections, layout, hasFormAction) => {
  const slots = components.filter(
    (component) => component?.component === actionsSlot
  )
  const hasNestedSlot = components.some((component) =>
    Object.entries(component ?? {}).some(
      ([name, value]) => name !== 'component' && containsActionsSlot(value)
    )
  )
  const hasSectionSlot = sections.some((section) =>
    containsActionsSlot(section.components ?? [])
  )

  if (hasNestedSlot || hasSectionSlot) {
    throw Boom.badGateway(
      'Agreement actions slot must be a top-level page component'
    )
  }

  if (slots.length > 1) {
    throw Boom.badGateway('Agreement page defines more than one actions slot')
  }

  if (slots.length && layout === 'document') {
    throw Boom.badGateway(
      'Agreement actions slot is not supported on document pages'
    )
  }

  if (slots.length && hasFormAction) {
    throw Boom.badGateway(
      'Agreement actions slot is not supported on form pages'
    )
  }
}

const buildContentRegions = (components) => {
  const regions = []
  let currentRegion

  for (const component of components) {
    if (component.component === actionsSlot) {
      regions.push({ kind: 'actions' })
      currentRegion = undefined
      continue
    }

    const width = component.width === 'full' ? 'full' : 'two-thirds'
    if (currentRegion?.width !== width) {
      currentRegion = { kind: 'content', width, components: [] }
      regions.push(currentRegion)
    }
    currentRegion.components.push(component)
  }

  if (!regions.some((region) => region.kind === 'actions')) {
    regions.push({ kind: 'actions' })
  }

  return regions
}

const buildSections = (sections, baseUrl, queryAuthentication) =>
  sections.map((section) => ({
    ...section,
    components: buildComponentUrls(
      section.components ?? [],
      baseUrl,
      queryAuthentication
    )
  }))

const buildPageViewModel = (renderModel, page) => ({
  pageTitle: page.title ?? renderModel.title ?? 'Agreement',
  showContents: page.contents ?? false,
  print: page.print ?? false,
  watermark: page.watermark,
  layout: page.layout ?? renderModel.layout ?? 'default'
})

const includeTransportMetadata = (transportMetadata) =>
  transportMetadata === undefined ? {} : { transportMetadata }

export const buildViewModel = (
  renderModel = {},
  baseUrl = '/',
  { queryAuthentication, transportMetadata } = {}
) => {
  const components = getComponents(renderModel)
  const actions = translateActionPaths(
    renderModel.actions ?? [],
    baseUrl,
    queryAuthentication
  )
  const hasFormAction = transportMetadata !== undefined
  const page = renderModel.page ?? {}
  const pageViewModel = buildPageViewModel(renderModel, page)
  const sections = renderModel.sections ?? []

  validateActionsSlot(components, sections, pageViewModel.layout, hasFormAction)

  if (hasFormAction) {
    validateActionForm(actions)
  }

  const builtComponents = buildComponentUrls(
    components,
    baseUrl,
    queryAuthentication
  )
  const usesContentRegions =
    !hasFormAction &&
    pageViewModel.layout !== 'document' &&
    (components.some((component) => component?.component === actionsSlot) ||
      components.some((component) => component?.width === 'full'))

  return {
    ...pageViewModel,
    agreement: renderModel.agreement,
    components: builtComponents,
    ...(usesContentRegions
      ? { contentRegions: buildContentRegions(builtComponents) }
      : {}),
    sections: buildSections(sections, baseUrl, queryAuthentication),
    actions,
    hasFormAction,
    errors: renderModel.errors ?? [],
    ...includeTransportMetadata(transportMetadata)
  }
}

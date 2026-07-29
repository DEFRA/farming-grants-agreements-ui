import path from 'node:path'

import Boom from '@hapi/boom'

import { getBaseUrl } from '#~/server/common/helpers/base-url.js'

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i
const gasActionPathPattern =
  /^\/agreements\/([a-z\d_-]+)\/actions\/([a-z\d_-]+)$/i
const supportedComponents = new Set([
  'accordion',
  'checkboxes',
  'container',
  'details',
  'heading',
  'line-break',
  'notification-banner',
  'ordered-list',
  'panel',
  'paragraph',
  'status',
  'summary-list',
  'table',
  'text',
  'unordered-list',
  'url',
  'warning-text',
  'watermark'
])

const findUnsupportedComponent = (value) => {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  if (value.component && !supportedComponents.has(value.component)) {
    return value.component
  }

  return Object.values(value)
    .map(findUnsupportedComponent)
    .find((component) => component)
}

const assertSupportedComponents = (components, request) => {
  const componentType = findUnsupportedComponent(components)
  if (!componentType) {
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    request.logger?.error({ componentType }, 'Unsupported agreement component')
  }

  throw Boom.badGateway('Unsupported agreement component')
}

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

const buildActionHref = (baseUrl, href) => {
  const match = href.match(gasActionPathPattern)
  if (!match) {
    throw Boom.badGateway('Unsupported agreement action URL')
  }

  const [, agreementNumber, actionName] = match
  return path.posix.join(baseUrl, agreementNumber, 'actions', actionName)
}

const buildActions = (actions = [], baseUrl = '/') =>
  actions.map((action) => ({
    ...action,
    ...(action.href ? { href: buildActionHref(baseUrl, action.href) } : {}),
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
    const components = renderModel?.components ?? renderModel?.content ?? []

    assertSupportedComponents(components, request)

    return h.view(
      'config-driven-agreement/page',
      buildConfigDrivenAgreementModel(renderModel, getBaseUrl(request))
    )
  }
}

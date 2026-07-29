import path from 'node:path'

import Boom from '@hapi/boom'

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i
const gasActionPathPattern =
  /^\/agreements\/([a-z\d_-]+)\/actions\/([a-z\d_-]+)$/i

const joinBasePath = (baseUrl, ...segments) => {
  if (!absoluteUrlPattern.test(baseUrl)) {
    return path.posix.join(baseUrl, ...segments)
  }

  const url = new URL(baseUrl)
  url.pathname = path.posix.join(url.pathname, ...segments)
  return url.toString()
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

  return joinBasePath(baseUrl, value)
}

const buildActionHref = (baseUrl, href) => {
  const match =
    typeof href === 'string' ? gasActionPathPattern.exec(href) : undefined
  if (!match) {
    throw Boom.badGateway('Unsupported agreement action URL')
  }

  const [, agreementNumber, actionName] = match
  return joinBasePath(baseUrl, agreementNumber, 'actions', actionName)
}

const translateActionPaths = (actions = [], baseUrl = '/') =>
  actions.map((action) => ({
    ...action,
    ...(Object.hasOwn(action, 'href')
      ? { href: buildActionHref(baseUrl, action.href) }
      : {}),
    ...(action.action
      ? { action: buildProxiedPath(baseUrl, action.action) }
      : {})
  }))

const hasWatermark = (components = []) =>
  components.some((component) => component?.component === 'watermark')

export const buildViewModel = (renderModel = {}, baseUrl = '/') => {
  const components = renderModel.components ?? renderModel.content ?? []

  return {
    pageTitle: renderModel.page?.title ?? renderModel.title ?? 'Agreement',
    agreement: renderModel.agreement,
    components,
    actions: translateActionPaths(renderModel.actions, baseUrl),
    errors: renderModel.errors ?? [],
    hasWatermark: hasWatermark(components),
    layout: renderModel.page?.layout ?? renderModel.layout ?? 'default'
  }
}

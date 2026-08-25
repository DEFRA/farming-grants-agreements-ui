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
      renderAsForm: translatedAction.method === 'POST'
    }
  })

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

const allowedGridWidths = new Set(['two-thirds', 'full'])

const assertExplicitComponentTree = (components) => {
  const isExplicitTree = components.every(
    (row) =>
      row?.component === 'grid-row' &&
      Array.isArray(row.components) &&
      row.components.every(
        (column) =>
          column?.component === 'grid-column' &&
          (column.width === undefined || allowedGridWidths.has(column.width)) &&
          Array.isArray(column.components)
      )
  )

  if (!isExplicitTree) {
    throw Boom.badGateway('Agreement page must use an explicit component tree')
  }
}

const invalidActionBindings = () => {
  throw Boom.badGateway('Invalid agreement action bindings')
}

const buildActionsByName = (actions) => {
  const actionsByName = new Map()

  for (const action of actions) {
    const target = action.renderAsForm
      ? (action.action ?? action.href)
      : action.href
    if (
      typeof action.name !== 'string' ||
      actionsByName.has(action.name) ||
      typeof target !== 'string' ||
      !target
    ) {
      invalidActionBindings()
    }

    actionsByName.set(action.name, action)
  }

  return actionsByName
}

const buildHiddenFields = (action, transportMetadata) => [
  ...(action.fields ?? []),
  ...(transportMetadata === undefined
    ? []
    : [transportMetadata.etag, transportMetadata.idempotencyKey])
]

const resolveComponentActions = (
  value,
  actionsByName,
  references,
  transportMetadata,
  enclosingFormActionId
) => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveComponentActions(
        item,
        actionsByName,
        references,
        transportMetadata,
        enclosingFormActionId
      )
    )
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  if (value.component === 'form') {
    const action = actionsByName.get(value.actionId)
    if (!action?.renderAsForm || enclosingFormActionId) {
      invalidActionBindings()
    }

    references.get(value.actionId).forms += 1
    const components = resolveComponentActions(
      value.components ?? [],
      actionsByName,
      references,
      transportMetadata,
      value.actionId
    )

    return {
      ...value,
      components,
      method: action.method ?? 'POST',
      formAction: action.action ?? action.href,
      hiddenFields: buildHiddenFields(action, transportMetadata)
    }
  }

  if (value.component === 'button') {
    const action = actionsByName.get(value.actionId)
    if (!action) {
      invalidActionBindings()
    }

    const referencesForAction = references.get(value.actionId)
    referencesForAction.buttons += 1

    if (action.renderAsForm !== (enclosingFormActionId !== undefined)) {
      invalidActionBindings()
    }
    if (action.renderAsForm && enclosingFormActionId !== value.actionId) {
      invalidActionBindings()
    }

    return {
      ...value,
      text: action.text,
      ...(value.classes || action.classes
        ? { classes: value.classes ?? action.classes }
        : {}),
      ...(action.renderAsForm ? { submit: true } : { href: action.href })
    }
  }

  return Object.fromEntries(
    Object.entries(value).map(([name, childValue]) => [
      name,
      resolveComponentActions(
        childValue,
        actionsByName,
        references,
        transportMetadata,
        enclosingFormActionId
      )
    ])
  )
}

const resolveActions = (components, sections, actions, transportMetadata) => {
  const actionsByName = buildActionsByName(actions)
  const references = new Map(
    actions.map(({ name }) => [name, { buttons: 0, forms: 0 }])
  )
  const resolve = (value) =>
    resolveComponentActions(value, actionsByName, references, transportMetadata)
  const resolvedComponents = resolve(components)
  const resolvedSections = sections.map((section) => ({
    ...section,
    components: resolve(section.components ?? [])
  }))

  for (const action of actions) {
    const { buttons, forms } = references.get(action.name)
    const expectedForms = action.renderAsForm ? 1 : 0
    if (buttons !== 1 || forms !== expectedForms) {
      invalidActionBindings()
    }
  }

  return { components: resolvedComponents, sections: resolvedSections }
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

export const buildViewModel = (
  renderModel = {},
  baseUrl = '/',
  { queryAuthentication, transportMetadata } = {}
) => {
  if (Object.hasOwn(renderModel, 'content')) {
    throw Boom.badGateway('Agreement page must use an explicit component tree')
  }

  const rawComponents = renderModel.components ?? []
  const rawSections = renderModel.sections ?? []
  assertExplicitComponentTree(rawComponents)
  rawSections.forEach((section) =>
    assertExplicitComponentTree(section.components ?? [])
  )

  const actions = translateActionPaths(
    renderModel.actions ?? [],
    baseUrl,
    queryAuthentication
  )
  const componentsWithUrls = buildComponentUrls(
    rawComponents,
    baseUrl,
    queryAuthentication
  )
  const sectionsWithUrls = buildSections(
    rawSections,
    baseUrl,
    queryAuthentication
  )
  const { components, sections } = resolveActions(
    componentsWithUrls,
    sectionsWithUrls,
    actions,
    transportMetadata
  )
  const page = renderModel.page ?? {}

  return {
    ...buildPageViewModel(renderModel, page),
    agreement: renderModel.agreement,
    components,
    sections,
    actions,
    errors: renderModel.errors ?? []
  }
}

import Boom from '@hapi/boom'

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

const safeAttributeNamePattern = /^[a-z_:][a-z\d:._-]*$/i

const isUnsafeAttributeName = (name) =>
  !safeAttributeNamePattern.test(name) || /^on/i.test(name)

const hasUnsafeAttributes = (attributes) => {
  if (
    !attributes ||
    typeof attributes !== 'object' ||
    Array.isArray(attributes)
  ) {
    return true
  }

  return Object.keys(attributes).some(isUnsafeAttributeName)
}

const isUnsafeCheckboxProperty = ([name, value]) =>
  name === 'html' || (name === 'attributes' && hasUnsafeAttributes(value))

const hasUnsafeCheckboxContent = (value) =>
  Boolean(value) &&
  typeof value === 'object' &&
  Object.entries(value).some(
    (entry) =>
      isUnsafeCheckboxProperty(entry) || hasUnsafeCheckboxContent(entry[1])
  )

const findUnsupportedComponent = (value) => {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  if (value.component && !supportedComponents.has(value.component)) {
    return value.component
  }

  return Object.values(value).map(findUnsupportedComponent).find(Boolean)
}

const assertSupportedComponents = (components, logger) => {
  const componentType = findUnsupportedComponent(components)
  if (!componentType) {
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    logger?.error({ componentType }, 'Unsupported agreement component')
  }

  throw Boom.badGateway('Unsupported agreement component')
}

const containsUnsafeCheckbox = (value) => {
  if (!value || typeof value !== 'object') {
    return false
  }

  if (value.component === 'checkboxes' && hasUnsafeCheckboxContent(value)) {
    return true
  }

  return Object.values(value).some(containsUnsafeCheckbox)
}

const assertSafeCheckboxes = (components) => {
  if (containsUnsafeCheckbox(components)) {
    throw Boom.badGateway('Unsupported agreement checkbox content')
  }
}

export const validateComponents = (components, logger) => {
  assertSupportedComponents(components, logger)
  assertSafeCheckboxes(components)
}

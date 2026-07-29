import { afterEach, describe, expect, it, vi } from 'vitest'

import { validateComponents } from './validate-components.js'

const supportedComponents = [
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
]

describe('validateComponents', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts every supported component type', () => {
    const components = supportedComponents.map((component) => ({ component }))

    expect(() => validateComponents(components)).not.toThrow()
  })

  it('rejects a nested unsupported component and logs its type', () => {
    const logger = { error: vi.fn() }
    const components = [
      {
        component: 'container',
        items: [{ component: 'unsupported-widget' }]
      }
    ]

    expect(() => validateComponents(components, logger)).toThrow(
      'Unsupported agreement component'
    )
    expect(logger.error).toHaveBeenCalledWith(
      { componentType: 'unsupported-widget' },
      'Unsupported agreement component'
    )
  })

  it('does not log an unsupported component in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const logger = { error: vi.fn() }

    expect(() =>
      validateComponents([{ component: 'unsupported-widget' }], logger)
    ).toThrow('Unsupported agreement component')
    expect(logger.error).not.toHaveBeenCalled()
  })

  it.each(['', null, false, 0])(
    'rejects an invalid supplied component type: %j',
    (componentType) => {
      const logger = { error: vi.fn() }

      expect(() =>
        validateComponents([{ component: componentType }], logger)
      ).toThrow('Unsupported agreement component')
      expect(logger.error).toHaveBeenCalledWith(
        { componentType },
        'Unsupported agreement component'
      )
    }
  )

  it.each([
    {
      component: 'checkboxes',
      name: 'confirm',
      items: [{ value: 'confirmed', html: '<img src=x onerror=alert(1)>' }]
    },
    {
      component: 'checkboxes',
      name: 'confirm',
      items: [
        {
          value: 'confirmed',
          text: 'Confirm',
          attributes: { onclick: 'alert(1)' }
        }
      ]
    },
    {
      component: 'checkboxes',
      name: 'confirm',
      items: [
        {
          value: 'confirmed',
          text: 'Confirm',
          attributes: { 'data-test onclick': 'alert(1)' }
        }
      ]
    },
    {
      component: 'checkboxes',
      name: 'confirm',
      attributes: 'onclick="alert(1)"',
      items: [{ value: 'confirmed', text: 'Confirm' }]
    },
    {
      component: 'checkboxes',
      name: 'confirm',
      attributes: null,
      items: [{ value: 'confirmed', text: 'Confirm' }]
    }
  ])('rejects unsafe checkbox content', (checkboxes) => {
    expect(() => validateComponents([checkboxes])).toThrow(
      'Unsupported agreement checkbox content'
    )
  })

  it('accepts a safe nested GOV.UK checkbox model', () => {
    const checkboxes = {
      component: 'checkboxes',
      name: 'confirm',
      hint: {
        text: 'Read the agreement before confirming',
        attributes: { 'data-testid': 'checkbox-hint' }
      },
      formGroup: {
        classes: 'govuk-!-margin-bottom-6',
        attributes: { 'data-testid': 'checkbox-form-group' }
      },
      items: [
        {
          value: 'confirmed',
          text: 'I confirm',
          checked: true,
          attributes: { 'data-testid': 'confirm-checkbox' },
          label: {
            classes: 'govuk-label--s',
            attributes: { 'data-testid': 'confirm-label' }
          },
          hint: {
            text: 'This confirmation is required',
            attributes: { 'data-testid': 'confirm-hint' }
          }
        }
      ]
    }

    expect(() => validateComponents([checkboxes])).not.toThrow()
  })
})

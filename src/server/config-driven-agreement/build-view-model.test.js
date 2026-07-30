import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

describe('buildViewModel', () => {
  it('builds the default view model', () => {
    expect(buildViewModel()).toEqual({
      pageTitle: 'Agreement',
      agreement: undefined,
      components: [],
      actions: [],
      errors: [],
      hasWatermark: false,
      layout: 'default'
    })
  })

  it('uses the GAS page model fields', () => {
    const agreement = { agreementNumber: 'PMF123' }
    const components = [{ component: 'watermark' }]
    const errors = [{ href: '#confirm', text: 'Confirm the agreement' }]

    expect(
      buildViewModel({
        agreement,
        page: { title: 'Your agreement', layout: 'document' },
        components,
        errors
      })
    ).toEqual({
      pageTitle: 'Your agreement',
      agreement,
      components,
      actions: [],
      errors,
      hasWatermark: true,
      layout: 'document'
    })
  })

  it('supports legacy top-level page fields and content', () => {
    const content = [{ component: 'paragraph', text: 'Hello' }]

    expect(
      buildViewModel({ title: 'Model title', layout: 'custom', content })
    ).toEqual(
      expect.objectContaining({
        pageTitle: 'Model title',
        components: content,
        layout: 'custom'
      })
    )
  })

  it('translates a GAS action href to the Agreements UI path', () => {
    const model = buildViewModel(
      {
        actions: [
          {
            href: '/agreements/PMF123/actions/accept',
            text: 'Accept agreement'
          }
        ]
      },
      '/agreement'
    )

    expect(model.actions[0].href).toBe('/agreement/PMF123/actions/accept')
  })

  it('preserves an absolute Agreements UI base URL', () => {
    const model = buildViewModel(
      {
        actions: [
          {
            href: '/agreements/PMF123/actions/accept',
            text: 'Accept agreement'
          }
        ]
      },
      'https://example.com/api'
    )

    expect(model.actions[0].href).toBe(
      'https://example.com/api/PMF123/actions/accept'
    )
  })

  it.each([
    'https://example.com/external',
    '/agreements/PMF123/actions/accept?confirmation=true',
    '/agreement/PMF123/accept',
    '/agreements/../actions/accept',
    '/agreements/%2e%2e/actions/accept',
    '',
    null,
    42
  ])('rejects an unsupported action href: %j', (href) => {
    expect(() =>
      buildViewModel({ actions: [{ href, text: 'Accept' }] })
    ).toThrow('Unsupported agreement action URL')
  })

  it('preserves an action without an href', () => {
    const model = buildViewModel({ actions: [{ text: 'No href' }] })

    expect(model.actions[0]).not.toHaveProperty('href')
  })

  it.each([
    ['https://example.com/api', 'https://example.com/api'],
    ['#confirm', '#confirm'],
    ['/agreement', '/agreement'],
    ['/agreement/PMF123', '/agreement/PMF123'],
    [
      '/agreements/PMF123/actions/accept',
      '/agreement/agreements/PMF123/actions/accept'
    ]
  ])('translates a legacy action target %s', (action, expected) => {
    const model = buildViewModel(
      { actions: [{ action, method: 'POST', text: 'Accept' }] },
      '/agreement'
    )

    expect(model.actions[0].action).toBe(expected)
  })

  it('preserves an absolute base URL for a legacy action target', () => {
    const model = buildViewModel(
      {
        actions: [
          {
            action: '/agreements/PMF123/actions/accept',
            method: 'POST',
            text: 'Accept'
          }
        ]
      },
      'https://example.com/api'
    )

    expect(model.actions[0].action).toBe(
      'https://example.com/api/agreements/PMF123/actions/accept'
    )
  })
})

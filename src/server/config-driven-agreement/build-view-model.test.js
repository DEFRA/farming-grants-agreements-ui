import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

describe('buildViewModel', () => {
  it('builds the default view model', () => {
    expect(buildViewModel()).toEqual({
      pageTitle: 'Agreement',
      agreement: undefined,
      components: [],
      sections: [],
      actions: [],
      hasFormAction: false,
      errors: [],
      showContents: false,
      print: false,
      watermark: undefined,
      layout: 'default'
    })
  })

  it('keeps a page without an actions slot or width on the legacy path', () => {
    const model = buildViewModel({
      components: [{ component: 'paragraph', text: 'Agreement details' }]
    })

    expect(model).not.toHaveProperty('contentRegions')
  })

  it('places actions between content regions at the configured slot', () => {
    const heading = { component: 'heading', text: 'Payments' }
    const details = { component: 'details', text: 'Update details' }

    const model = buildViewModel({
      components: [heading, { component: 'actions' }, details]
    })

    expect(model.contentRegions).toEqual([
      { kind: 'content', width: 'two-thirds', components: [heading] },
      { kind: 'actions' },
      { kind: 'content', width: 'two-thirds', components: [details] }
    ])
  })

  it('places actions after content when the slot is last', () => {
    const paragraph = { component: 'paragraph', text: 'Agreement details' }

    const model = buildViewModel({
      components: [paragraph, { component: 'actions' }]
    })

    expect(model.contentRegions).toEqual([
      { kind: 'content', width: 'two-thirds', components: [paragraph] },
      { kind: 'actions' }
    ])
  })

  it('groups contiguous content by width and defaults to two-thirds', () => {
    const heading = { component: 'heading', text: 'Payments' }
    const paragraph = { component: 'paragraph', text: 'Payment details' }
    const table = { component: 'table', width: 'full' }
    const details = { component: 'details', text: 'Update details' }

    const model = buildViewModel({
      components: [heading, paragraph, table, details]
    })

    expect(model.contentRegions).toEqual([
      {
        kind: 'content',
        width: 'two-thirds',
        components: [heading, paragraph]
      },
      { kind: 'content', width: 'full', components: [table] },
      { kind: 'content', width: 'two-thirds', components: [details] },
      { kind: 'actions' }
    ])
  })

  it('rejects more than one actions slot', () => {
    expect(() =>
      buildViewModel({
        components: [{ component: 'actions' }, { component: 'actions' }]
      })
    ).toThrow('Agreement page defines more than one actions slot')
  })

  it.each([
    {
      description: 'inside a component',
      renderModel: {
        components: [
          {
            component: 'container',
            items: [{ component: 'actions' }]
          }
        ]
      }
    },
    {
      description: 'inside a document section',
      renderModel: {
        components: [{ component: 'paragraph', text: 'Overview' }],
        sections: [
          {
            components: [{ component: 'actions' }]
          }
        ]
      }
    }
  ])('rejects an actions slot $description', ({ renderModel }) => {
    expect(() => buildViewModel(renderModel)).toThrow(
      'Agreement actions slot must be a top-level page component'
    )
  })

  it('rejects an actions slot on a document page', () => {
    expect(() =>
      buildViewModel({
        page: { layout: 'document' },
        components: [{ component: 'actions' }]
      })
    ).toThrow('Agreement actions slot is not supported on document pages')
  })

  it('rejects an actions slot on a form page', () => {
    expect(() =>
      buildViewModel(
        {
          components: [{ component: 'actions' }],
          actions: [{ method: 'POST', text: 'Accept' }]
        },
        '/',
        { transportMetadata: {} }
      )
    ).toThrow('Agreement actions slot is not supported on form pages')
  })

  it('uses the GAS page model fields', () => {
    const agreement = { agreementNumber: 'PMF123' }
    const components = [{ component: 'heading', text: 'Agreement' }]
    const watermark = { text: 'DRAFT' }
    const errors = [{ href: '#confirm', text: 'Confirm the agreement' }]

    expect(
      buildViewModel({
        agreement,
        page: {
          title: 'Your agreement',
          layout: 'document',
          contents: true,
          print: true,
          watermark
        },
        components,
        sections: [
          {
            id: 'payment-schedule',
            title: 'Payment schedule',
            components: [
              {
                component: 'url',
                href: '/agreements/PMF123/document',
                text: 'View payment'
              }
            ]
          }
        ],
        errors
      })
    ).toEqual({
      pageTitle: 'Your agreement',
      agreement,
      components,
      sections: [
        {
          id: 'payment-schedule',
          title: 'Payment schedule',
          components: [
            {
              component: 'url',
              href: '/PMF123',
              text: 'View payment'
            }
          ]
        }
      ],
      actions: [],
      hasFormAction: false,
      errors,
      showContents: true,
      print: true,
      watermark,
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

  it('translates an agreement document link and preserves query authentication', () => {
    const model = buildViewModel(
      {
        components: [
          {
            component: 'url',
            href: '/agreements/PMF123/document',
            text: 'View your agreement'
          }
        ]
      },
      '/agreement',
      { queryAuthentication: 'signed-token' }
    )

    expect(model.components).toContainEqual({
      component: 'url',
      href: '/agreement/PMF123?x-encrypted-auth=signed-token',
      text: 'View your agreement'
    })
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

  it('preserves a genuine external action href', () => {
    const model = buildViewModel({
      actions: [{ href: 'https://example.com/external', text: 'External' }]
    })

    expect(model.actions[0].href).toBe('https://example.com/external')
  })

  it('translates a GAS action href with query parameters', () => {
    const model = buildViewModel(
      {
        actions: [
          {
            href: '/agreements/PMF123/actions/accept?confirmation=true',
            text: 'Accept'
          }
        ]
      },
      '/agreement'
    )

    expect(model.actions[0].href).toBe(
      '/agreement/PMF123/actions/accept?confirmation=true'
    )
  })

  it.each([
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
    ['#confirm', '#confirm'],
    ['/agreement', '/agreement'],
    ['/agreement/PMF123', '/agreement/PMF123'],
    ['/agreements/PMF123/actions/accept', '/agreement/PMF123/actions/accept']
  ])('translates a legacy action target %s', (action, expected) => {
    const model = buildViewModel(
      { actions: [{ action, method: 'POST', text: 'Accept' }] },
      '/agreement'
    )

    expect(model.actions[0].action).toBe(expected)
  })

  it('rejects an external POST action target', () => {
    expect(() =>
      buildViewModel({
        actions: [
          {
            action: 'https://example.com/collect-agreement-values',
            method: 'POST',
            text: 'Submit externally'
          }
        ]
      })
    ).toThrow('Unsupported agreement action URL')
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
      'https://example.com/api/PMF123/actions/accept'
    )
  })
})

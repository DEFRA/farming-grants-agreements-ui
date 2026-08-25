import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

const explicitTree = (components) => [
  {
    component: 'grid-row',
    components: [{ component: 'grid-column', width: 'two-thirds', components }]
  }
]

const actionPage = (
  action,
  components = [{ component: 'button', actionId: action.name }]
) => ({
  actions: [action],
  components: explicitTree(components)
})

describe('buildViewModel', () => {
  it('builds the default view model', () => {
    expect(buildViewModel()).toEqual({
      pageTitle: 'Agreement',
      agreement: undefined,
      components: [],
      sections: [],
      actions: [],
      errors: [],
      showContents: false,
      print: false,
      watermark: undefined,
      layout: 'default'
    })
  })

  it('uses the GAS page model fields', () => {
    const agreement = { agreementNumber: 'PMF123' }
    const components = explicitTree([
      { component: 'heading', text: 'Agreement' }
    ])
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
            components: explicitTree([
              {
                component: 'url',
                href: '/agreements/PMF123/document',
                text: 'View payment'
              }
            ])
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
          components: explicitTree([
            {
              component: 'url',
              href: '/PMF123',
              text: 'View payment'
            }
          ])
        }
      ],
      actions: [],
      errors,
      showContents: true,
      print: true,
      watermark,
      layout: 'document'
    })
  })

  it('rejects a flat component list instead of using a legacy renderer', () => {
    expect(() =>
      buildViewModel({
        components: [{ component: 'paragraph', text: 'Legacy content' }]
      })
    ).toThrow('Agreement page must use an explicit component tree')
  })

  it('rejects a supplied legacy content payload instead of rendering an empty page', () => {
    expect(() =>
      buildViewModel({
        content: [{ component: 'paragraph', text: 'Legacy content' }],
        components: []
      })
    ).toThrow('Agreement page must use an explicit component tree')
  })

  it('translates a GAS action href to the Agreements UI path', () => {
    const model = buildViewModel(
      actionPage({
        name: 'accept',
        href: '/agreements/PMF123/actions/accept',
        text: 'Accept agreement'
      }),
      '/agreement'
    )

    expect(model.actions[0].href).toBe('/agreement/PMF123/actions/accept')
  })

  it('translates an agreement document link and preserves query authentication', () => {
    const model = buildViewModel(
      {
        components: explicitTree([
          {
            component: 'url',
            href: '/agreements/PMF123/document',
            text: 'View your agreement'
          }
        ])
      },
      '/agreement',
      { queryAuthentication: 'signed-token' }
    )

    expect(model.components[0].components[0].components).toContainEqual({
      component: 'url',
      href: '/agreement/PMF123?x-encrypted-auth=signed-token',
      text: 'View your agreement'
    })
  })

  it('preserves an absolute Agreements UI base URL', () => {
    const model = buildViewModel(
      actionPage({
        name: 'accept',
        href: '/agreements/PMF123/actions/accept',
        text: 'Accept agreement'
      }),
      'https://example.com/api'
    )

    expect(model.actions[0].href).toBe(
      'https://example.com/api/PMF123/actions/accept'
    )
  })

  it('preserves a genuine external action href', () => {
    const model = buildViewModel(
      actionPage({
        name: 'external',
        href: 'https://example.com/external',
        text: 'External'
      })
    )

    expect(model.actions[0].href).toBe('https://example.com/external')
  })

  it('translates a GAS action href with query parameters', () => {
    const model = buildViewModel(
      actionPage({
        name: 'accept',
        href: '/agreements/PMF123/actions/accept?confirmation=true',
        text: 'Accept'
      }),
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

  it.each([
    ['#confirm', '#confirm'],
    ['/agreement', '/agreement'],
    ['/agreement/PMF123', '/agreement/PMF123'],
    ['/agreements/PMF123/actions/accept', '/agreement/PMF123/actions/accept']
  ])('translates a legacy action target %s', (action, expected) => {
    const model = buildViewModel(
      actionPage({ name: 'accept', action, method: 'POST', text: 'Accept' }, [
        {
          component: 'form',
          actionId: 'accept',
          components: [{ component: 'button', actionId: 'accept' }]
        }
      ]),
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
      actionPage(
        {
          name: 'accept',
          action: '/agreements/PMF123/actions/accept',
          method: 'POST',
          text: 'Accept'
        },
        [
          {
            component: 'form',
            actionId: 'accept',
            components: [{ component: 'button', actionId: 'accept' }]
          }
        ]
      ),
      'https://example.com/api'
    )

    expect(model.actions[0].action).toBe(
      'https://example.com/api/PMF123/actions/accept'
    )
  })

  it('resolves one GET button from its GAS action name', () => {
    const model = buildViewModel(
      actionPage({
        name: 'accept',
        href: '/agreements/PMF123/actions/accept',
        text: 'Accept agreement'
      }),
      '/agreement'
    )
    const button = model.components[0].components[0].components[0]

    expect(button).toEqual({
      component: 'button',
      actionId: 'accept',
      href: '/agreement/PMF123/actions/accept',
      text: 'Accept agreement'
    })
  })

  it('resolves one POST form with its matching nested button and hidden fields', () => {
    const model = buildViewModel(
      actionPage(
        {
          name: 'accept',
          action: '/agreements/PMF123/actions/accept',
          method: 'POST',
          text: 'Accept agreement',
          fields: [{ name: 'source', value: 'offer' }]
        },
        [
          {
            component: 'form',
            actionId: 'accept',
            components: [
              { component: 'checkboxes', name: 'confirm', items: [] },
              { component: 'button', actionId: 'accept' }
            ]
          }
        ]
      ),
      '/agreement',
      {
        transportMetadata: {
          etag: { name: 'etag', value: 'v1' },
          idempotencyKey: { name: 'key', value: 'id-1' }
        }
      }
    )
    const form = model.components[0].components[0].components[0]

    expect(form).toMatchObject({
      component: 'form',
      actionId: 'accept',
      method: 'POST',
      formAction: '/agreement/PMF123/actions/accept',
      hiddenFields: [
        { name: 'source', value: 'offer' },
        { name: 'etag', value: 'v1' },
        { name: 'key', value: 'id-1' }
      ]
    })
    expect(form.components[1]).toEqual({
      component: 'button',
      actionId: 'accept',
      text: 'Accept agreement',
      submit: true
    })
  })

  it.each([
    [
      'an unknown action',
      actionPage(
        {
          name: 'accept',
          href: '/agreements/PMF123/actions/accept',
          text: 'Accept'
        },
        [{ component: 'button', actionId: 'missing' }]
      )
    ],
    [
      'an unreferenced action',
      {
        actions: [
          {
            name: 'accept',
            href: '/agreements/PMF123/actions/accept',
            text: 'Accept'
          }
        ],
        components: explicitTree([])
      }
    ],
    [
      'a POST button outside its form',
      actionPage({
        name: 'accept',
        action: '/agreements/PMF123/actions/accept',
        method: 'POST',
        text: 'Accept'
      })
    ],
    [
      'a POST form without its button',
      actionPage(
        {
          name: 'accept',
          action: '/agreements/PMF123/actions/accept',
          method: 'POST',
          text: 'Accept'
        },
        [{ component: 'form', actionId: 'accept', components: [] }]
      )
    ]
  ])('rejects invalid action binding: %s', (_description, page) => {
    expect(() => buildViewModel(page)).toThrow(
      'Invalid agreement action bindings'
    )
  })
})

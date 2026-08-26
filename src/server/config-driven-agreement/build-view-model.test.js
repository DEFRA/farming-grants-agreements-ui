import { describe, expect, it } from 'vitest'

import { buildViewModel } from './build-view-model.js'

const componentTree = (components) => [
  {
    component: 'grid-row',
    components: [{ component: 'grid-column', width: 'two-thirds', components }]
  }
]

describe('buildViewModel', () => {
  it('builds the default view model', () => {
    expect(buildViewModel()).toEqual({
      pageTitle: 'Agreement',
      agreement: undefined,
      components: [],
      sections: [],
      errors: [],
      showContents: false,
      print: false,
      watermark: undefined,
      layout: 'default'
    })
  })

  it('rewrites a resolved Back link for the agreement UI route', () => {
    expect(
      buildViewModel(
        {
          page: {
            backLink: { text: 'Back to offer', href: '/agreements/PMF123' }
          }
        },
        '/agreement',
        { queryAuthentication: 'signed-token' }
      ).backLink
    ).toEqual({
      text: 'Back to offer',
      href: '/agreement/PMF123?x-encrypted-auth=signed-token'
    })
  })

  it('does not consume legacy content or an actions catalogue', () => {
    const model = buildViewModel({
      content: [{ component: 'paragraph', text: 'Legacy content' }],
      actions: [{ name: 'legacy-action' }]
    })

    expect(model.components).toEqual([])
    expect(model).not.toHaveProperty('actions')
  })

  it('passes the resolved GAS component tree through without an action catalogue', () => {
    const components = componentTree([
      {
        component: 'button',
        text: 'Continue',
        href: '/agreements/PMF123/actions/continue'
      }
    ])

    expect(
      buildViewModel(
        {
          page: { title: 'Your agreement' },
          components,
          errors: []
        },
        '/agreement'
      )
    ).toMatchObject({
      pageTitle: 'Your agreement',
      components: componentTree([
        {
          component: 'button',
          text: 'Continue',
          href: '/agreement/PMF123/actions/continue'
        }
      ]),
      errors: []
    })
  })

  it('uses the navigation URL policy for button links', () => {
    const model = buildViewModel(
      {
        components: componentTree([
          { component: 'button', text: 'Read guidance', href: 'guidance' }
        ])
      },
      '/agreement',
      { queryAuthentication: 'signed-token' }
    )

    expect(model.components[0].components[0].components[0].href).toBe(
      '/agreement/guidance?x-encrypted-auth=signed-token'
    )
  })

  it('rewrites resolved form and component URLs and injects request transport fields', () => {
    const model = buildViewModel(
      {
        components: componentTree([
          {
            component: 'url',
            href: '/agreements/PMF123/document',
            text: 'View agreement'
          },
          {
            component: 'form',
            method: 'POST',
            formAction: '/agreements/PMF123/actions/accept',
            hiddenFields: [{ name: 'source', value: 'offer' }],
            components: [{ component: 'button', text: 'Accept', submit: true }]
          }
        ])
      },
      '/agreement',
      {
        queryAuthentication: 'signed-token',
        transportMetadata: {
          etag: { name: 'etag', value: 'v1' },
          idempotencyKey: { name: 'key', value: 'id-1' }
        }
      }
    )
    const [url, form] = model.components[0].components[0].components

    expect(url.href).toBe('/agreement/PMF123?x-encrypted-auth=signed-token')
    expect(form).toEqual({
      component: 'form',
      method: 'POST',
      formAction:
        '/agreement/PMF123/actions/accept?x-encrypted-auth=signed-token',
      hiddenFields: [
        { name: 'source', value: 'offer' },
        { name: 'etag', value: 'v1' },
        { name: 'key', value: 'id-1' }
      ],
      components: [{ component: 'button', text: 'Accept', submit: true }]
    })
  })

  it('rewrites resolved URLs in sections', () => {
    const model = buildViewModel(
      {
        sections: [
          {
            id: 'terms',
            components: componentTree([
              {
                component: 'url',
                params: {
                  href: '/agreements/PMF123/actions/review',
                  text: 'Review'
                }
              }
            ])
          }
        ]
      },
      '/agreement'
    )

    expect(
      model.sections[0].components[0].components[0].components[0].params.href
    ).toBe('/agreement/PMF123/actions/review')
  })

  it('does not enforce GAS-owned tree shape, widths or form cardinality', () => {
    const components = [
      {
        component: 'grid-column',
        width: 'provider-owned-width',
        components: [
          {
            component: 'form',
            method: 'POST',
            formAction: '/agreements/PMF123/actions/first',
            components: []
          },
          {
            component: 'form',
            method: 'POST',
            formAction: '/agreements/PMF123/actions/second',
            components: []
          }
        ]
      }
    ]

    expect(() => buildViewModel({ components })).not.toThrow()
  })

  it.each(['javascript:alert(1)', '//evil.example/x', 'http://'])(
    'rejects unsafe resolved button URL %s',
    (href) => {
      expect(() =>
        buildViewModel({
          components: componentTree([
            { component: 'button', text: 'Unsafe', href }
          ])
        })
      ).toThrow()
    }
  )

  it('retains safe external GET links but rejects external form targets', () => {
    expect(
      buildViewModel({
        components: componentTree([
          {
            component: 'button',
            text: 'Guidance',
            href: 'https://example.com/guidance'
          }
        ])
      }).components[0].components[0].components[0].href
    ).toBe('https://example.com/guidance')

    expect(() =>
      buildViewModel({
        components: componentTree([
          {
            component: 'form',
            formAction: 'https://example.com/collect',
            components: []
          }
        ])
      })
    ).toThrow('Unsupported agreement action URL')
  })
})

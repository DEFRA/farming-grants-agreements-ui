import { load } from 'cheerio'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { config } from '#~/config/config.js'
import { createServer } from '#~/server/server.js'
import { extractJwtPayload } from '#~/server/common/helpers/jwt-auth.js'

const actionTransportFieldNames = {
  etag: '__agreementsUiEtag',
  idempotencyKey: '__agreementsUiIdempotencyKey'
}

const formPayload = (values) => {
  const payload = new URLSearchParams()

  for (const [name, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      payload.append(name, String(item))
    }
  }

  return payload.toString()
}

vi.mock('#~/server/common/helpers/jwt-auth.js', () => ({
  extractJwtPayload: vi.fn()
}))

const gasJwtPayload = {
  grantCode: 'generic-gas-grant',
  clientRef: 'client-reference',
  sbi: '123456789',
  source: 'defra'
}

const responseHeaders = (values) => new Headers(values)

const gasPageResponse = (pageModel, etag, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 422 ? 'Unprocessable Entity' : 'OK',
  headers: responseHeaders({ etag }),
  json: vi.fn().mockResolvedValue(pageModel)
})

const gasRedirectResponse = (status, location) => ({
  ok: false,
  status,
  statusText: status === 303 ? 'See Other' : 'Precondition Failed',
  headers: responseHeaders({ location }),
  json: vi.fn()
})

const actionPageModel = (overrides = {}) => ({
  page: { title: 'Configure any agreement operation' },
  components: [
    {
      component: 'paragraph',
      text: 'This content is owned completely by GAS.'
    }
  ],
  errors: [],
  actions: [
    {
      method: 'POST',
      action: '/agreements/AGR_42/actions/recalculate-anything',
      fields: [
        { name: 'contactPreference', value: 'email' },
        { name: 'anythingAtAll', value: 'kept exactly' }
      ],
      text: 'Run arbitrary operation'
    }
  ],
  ...overrides
})

describe('generic GAS Agreement action routes', () => {
  let server
  let originalFetch

  beforeAll(async () => {
    originalFetch = globalThis.fetch
    config.set('gasBackend.url', 'http://gas.internal:3102')
    config.set('gasBackend.authToken', 'gas-service-token')
    config.set('gasBackend.allowedGrantCodes', ['generic-gas-grant'])
    globalThis.fetch = vi.fn()
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    globalThis.fetch = originalFetch
    await server?.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    extractJwtPayload.mockReturnValue(gasJwtPayload)
  })

  test('GET proxies an arbitrary action, preserves the model and carries one UUID v4 with the GAS ETag', async () => {
    const pageModel = actionPageModel()
    const originalModel = structuredClone(pageModel)
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(pageModel, '"AGR_42:7"')
    )

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/recalculate-anything?view=latest&x-encrypted-auth=query-auth',
      headers: { 'x-base-url': '/agreement' }
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['referrer-policy']).toBe('no-referrer')
    expect(pageModel).toEqual(originalModel)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://gas.internal:3102/agreements/AGR_42/actions/recalculate-anything?view=latest',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer gas-service-token',
          'x-agreement-source': 'defra',
          'x-agreement-code': 'generic-gas-grant',
          'x-agreement-sbi': '123456789'
        },
        signal: expect.any(AbortSignal),
        redirect: 'manual'
      }
    )

    const $ = load(response.result)
    const etagInputs = $(`input[name="${actionTransportFieldNames.etag}"]`)
    const idempotencyInputs = $(
      `input[name="${actionTransportFieldNames.idempotencyKey}"]`
    )

    expect(etagInputs).toHaveLength(1)
    expect(etagInputs.val()).toBe('"AGR_42:7"')
    expect(idempotencyInputs).toHaveLength(1)
    expect(idempotencyInputs.val()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
    expect($('form').attr('action')).toBe(
      '/agreement/AGR_42/actions/recalculate-anything?x-encrypted-auth=query-auth'
    )
    expect($('input[name="contactPreference"]').val()).toBe('email')
    expect($('input[name="anythingAtAll"]').val()).toBe('kept exactly')
    expect(response.result).toContain(
      'This content is owned completely by GAS.'
    )
  })

  test('does not expose GAS actions to Caseworking', async () => {
    extractJwtPayload.mockReturnValue({
      source: 'entra',
      grantCode: 'generic-gas-grant'
    })

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/accept',
      headers: { 'x-encrypted-auth': 'caseworking-auth' }
    })

    expect(response.statusCode).toBe(404)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test('renders a GAS POST href as a form containing the page fields', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(
        actionPageModel({
          components: [
            {
              component: 'checkboxes',
              name: 'confirm',
              items: [{ value: 'confirmed', text: 'Confirm agreement' }]
            }
          ],
          actions: [
            {
              name: 'accept',
              method: 'POST',
              href: '/agreements/AGR_42/actions/accept',
              text: 'Accept agreement offer'
            }
          ]
        }),
        '"AGR_42:7"'
      )
    )

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/accept',
      headers: { 'x-base-url': '/agreement' }
    })

    const $ = load(response.result)
    const form = $('form')

    expect(response.statusCode).toBe(200)
    expect(form).toHaveLength(1)
    expect(form.attr('method')).toBe('POST')
    expect(form.attr('action')).toBe('/agreement/AGR_42/actions/accept')
    expect(form.find('input[name="confirm"]')).toHaveLength(1)
    expect(form.find('input[name="__agreementsUiEtag"]')).toHaveLength(1)
    expect(form.find('button[type="submit"]').attr('name')).toBeUndefined()
    expect($('a.govuk-button')).toHaveLength(0)
  })

  test('keeps GAS controls inside the POST form when the page has a secondary link', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(
        actionPageModel({
          components: [
            {
              component: 'checkboxes',
              name: 'confirm',
              items: [{ value: 'confirmed', text: 'Confirm agreement' }]
            }
          ],
          actions: [
            {
              method: 'POST',
              href: '/agreements/AGR_42/actions/accept',
              text: 'Accept agreement offer'
            },
            {
              href: '/agreements/AGR_42',
              text: 'Return to agreement'
            }
          ]
        }),
        '"AGR_42:7"'
      )
    )

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/accept',
      headers: { 'x-base-url': '/agreement' }
    })

    const $ = load(response.result)
    const postForm = $('form[method="POST"]')

    expect(response.statusCode).toBe(200)
    expect(postForm).toHaveLength(1)
    expect(postForm.find('input[name="confirm"]')).toHaveLength(1)
    expect($('a:contains("Return to agreement")')).toHaveLength(1)
  })

  test('rejects a GAS action page containing more than one form', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(
        actionPageModel({
          actions: [
            {
              method: 'POST',
              href: '/agreements/AGR_42/actions/accept',
              text: 'Accept agreement offer'
            },
            {
              method: 'POST',
              href: '/agreements/AGR_42/actions/decline',
              text: 'Decline agreement offer'
            }
          ]
        }),
        '"AGR_42:7"'
      )
    )

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/accept',
      headers: { 'x-base-url': '/agreement' }
    })

    expect(response.statusCode).toBe(502)
  })

  test('rejects a GAS action page that does not contain a form', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(
        actionPageModel({
          actions: [
            {
              href: '/agreements/AGR_42',
              text: 'Return to agreement'
            }
          ]
        }),
        '"AGR_42:7"'
      )
    )

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/accept',
      headers: { 'x-base-url': '/agreement' }
    })

    expect(response.statusCode).toBe(502)
  })

  test('rejects a GAS action page whose form does not use POST', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(
        actionPageModel({
          actions: [
            {
              method: 'GET',
              action: '/agreements/AGR_42/actions/accept',
              text: 'Submit agreement action'
            }
          ]
        }),
        '"AGR_42:7"'
      )
    )

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/accept',
      headers: { 'x-base-url': '/agreement' }
    })

    expect(response.statusCode).toBe(502)
  })

  test('translates configured GAS URLs throughout the page and retains external links', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(
        actionPageModel({
          components: [
            {
              component: 'container',
              items: [
                {
                  component: 'url',
                  href: '/agreements/AGR_42/actions/next',
                  text: 'Next action'
                },
                {
                  component: 'summary-list',
                  rows: [
                    {
                      label: 'Review',
                      text: [
                        {
                          component: 'url',
                          params: {
                            href: 'http://gas.internal:3102/agreements/AGR_42/actions/review?stage=confirm',
                            text: 'Review action'
                          }
                        }
                      ]
                    }
                  ]
                },
                {
                  component: 'url',
                  href: 'https://example.com/guidance',
                  text: 'External guidance'
                },
                {
                  component: 'url',
                  href: 'mailto:agreements@example.com',
                  text: 'Email agreements'
                }
              ]
            }
          ],
          actions: [
            {
              method: 'POST',
              action:
                'http://gas.internal:3102/agreements/AGR_42/actions/recalculate-anything?stage=confirm',
              text: 'Run operation'
            },
            {
              href: 'http://example.com/help',
              text: 'External help over HTTP'
            }
          ]
        }),
        '"AGR_42:7"'
      )
    )

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/recalculate-anything?x-encrypted-auth=query-auth',
      headers: { 'x-base-url': '/agreement' }
    })

    const $ = load(response.result)
    expect($('form').attr('action')).toBe(
      '/agreement/AGR_42/actions/recalculate-anything?stage=confirm&x-encrypted-auth=query-auth'
    )
    expect($('a:contains("Next action")').attr('href')).toBe(
      '/agreement/AGR_42/actions/next?x-encrypted-auth=query-auth'
    )
    expect($('a:contains("Review action")').attr('href')).toBe(
      '/agreement/AGR_42/actions/review?stage=confirm&x-encrypted-auth=query-auth'
    )
    expect($('a[href="https://example.com/guidance"]')).toHaveLength(1)
    expect($('a[href="mailto:agreements@example.com"]')).toHaveLength(1)
    expect($('a[href="http://example.com/help"]')).toHaveLength(1)
    expect(response.result).not.toContain('http://gas.internal:3102')
  })

  test.each([
    [
      'a JavaScript action href',
      { actions: [{ href: 'javascript:alert(1)', text: 'Unsafe action' }] }
    ],
    [
      'a protocol-relative action href',
      { actions: [{ href: '//evil.example/x', text: 'Unsafe action' }] }
    ],
    [
      'a malformed absolute action href',
      { actions: [{ href: 'http://', text: 'Malformed action' }] }
    ],
    [
      'a JavaScript component URL',
      {
        components: [
          { component: 'url', href: 'javascript:alert(1)', text: 'Unsafe URL' }
        ]
      }
    ],
    [
      'a protocol-relative component URL',
      {
        components: [
          { component: 'url', href: '//evil.example/x', text: 'Unsafe URL' }
        ]
      }
    ],
    [
      'a malformed absolute component URL',
      {
        components: [
          { component: 'url', href: 'http://', text: 'Malformed URL' }
        ]
      }
    ]
  ])(
    'rejects a GAS page containing %s',
    async (_description, pageOverrides) => {
      globalThis.fetch.mockResolvedValueOnce(
        gasPageResponse(actionPageModel(pageOverrides), '"AGR_42:7"')
      )

      const response = await server.inject({
        method: 'GET',
        url: '/AGR_42/actions/recalculate-anything',
        headers: { 'x-encrypted-auth': 'auth' }
      })

      expect(response.statusCode).toBe(502)
    }
  )

  test('rejects a GAS page that posts Agreement values to an external URL', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(
        actionPageModel({
          actions: [
            {
              method: 'POST',
              href: 'https://example.com/collect-agreement-values',
              text: 'Submit externally'
            }
          ]
        }),
        '"AGR_42:7"'
      )
    )

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/anything',
      headers: { 'x-encrypted-auth': 'auth' }
    })

    expect(response.statusCode).toBe(502)
  })

  test('POST parses browser form values, removes transport metadata and renders the complete 422 model', async () => {
    const idempotencyKey = '9ea924aa-45e9-43a7-888e-c25054ea658c'
    const validationModel = actionPageModel({
      components: [
        { component: 'heading', level: 1, text: 'GAS validation heading' },
        { component: 'paragraph', text: 'GAS validation explanation' }
      ],
      errors: [{ href: '#unusual-field', text: 'GAS supplied error text' }]
    })
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(validationModel, '"AGR_42:8"', 422)
    )

    const response = await server.inject({
      method: 'POST',
      url: '/AGR_42/actions/recalculate-anything',
      headers: {
        'x-encrypted-auth': 'header-auth',
        'x-base-url': '/agreement',
        'content-type': 'application/x-www-form-urlencoded'
      },
      payload: formPayload({
        [actionTransportFieldNames.etag]: '"AGR_42:7"',
        [actionTransportFieldNames.idempotencyKey]: idempotencyKey,
        confirm: 'confirmed',
        contactPreference: 'email',
        'field.with-arbitrary-name': ['first', 'second'],
        untouchedFalseValue: false
      })
    })

    expect(response.statusCode).toBe(422)
    const fetchOptions = globalThis.fetch.mock.calls[0][1]
    expect(fetchOptions).toEqual({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'If-Match': '"AGR_42:7"',
        'Idempotency-Key': idempotencyKey,
        Authorization: 'Bearer gas-service-token',
        'x-agreement-source': 'defra',
        'x-agreement-code': 'generic-gas-grant',
        'x-agreement-sbi': '123456789'
      },
      body: JSON.stringify({
        values: {
          confirm: 'confirmed',
          contactPreference: 'email',
          'field.with-arbitrary-name': ['first', 'second'],
          untouchedFalseValue: 'false'
        }
      }),
      signal: expect.any(AbortSignal),
      redirect: 'manual'
    })
    expect(fetchOptions.headers).not.toHaveProperty('x-encrypted-auth')

    const $ = load(response.result)
    expect(response.result).toContain('GAS validation heading')
    expect(response.result).toContain('GAS validation explanation')
    expect(response.result).toContain('GAS supplied error text')
    expect($(`input[name="${actionTransportFieldNames.etag}"]`).val()).toBe(
      '"AGR_42:8"'
    )
    expect(
      $(`input[name="${actionTransportFieldNames.idempotencyKey}"]`).val()
    ).toBe(idempotencyKey)
  })

  test('repeated successful submissions always reach GAS with the carried metadata and translate its 303 without following it', async () => {
    const carriedPayload = {
      [actionTransportFieldNames.etag]: '"AGR_42:8"',
      [actionTransportFieldNames.idempotencyKey]:
        '9ea924aa-45e9-43a7-888e-c25054ea658c',
      ordinaryValue: 'unchanged'
    }
    globalThis.fetch
      .mockResolvedValueOnce(
        gasRedirectResponse(303, 'http://gas.internal:3102/agreements/current')
      )
      .mockResolvedValueOnce(
        gasRedirectResponse(303, 'http://gas.internal:3102/agreements/current')
      )

    const submit = () =>
      server.inject({
        method: 'POST',
        url: '/AGR_42/actions/recalculate-anything',
        headers: {
          'x-encrypted-auth': 'auth',
          'x-base-url': '/agreement',
          'content-type': 'application/x-www-form-urlencoded'
        },
        payload: formPayload(carriedPayload)
      })

    const firstResponse = await submit()
    const secondResponse = await submit()

    expect(firstResponse.statusCode).toBe(303)
    expect(secondResponse.statusCode).toBe(303)
    expect(firstResponse.headers.location).toBe('/agreement')
    expect(secondResponse.headers.location).toBe('/agreement')
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)

    for (const [, options] of globalThis.fetch.mock.calls) {
      expect(options.redirect).toBe('manual')
      expect(options.headers['If-Match']).toBe('"AGR_42:8"')
      expect(options.headers['Idempotency-Key']).toBe(
        carriedPayload[actionTransportFieldNames.idempotencyKey]
      )
      expect(options.body).toBe(
        JSON.stringify({ values: { ordinaryValue: 'unchanged' } })
      )
    }
  })

  test('a stale 412 becomes a GET redirect to the translated current Agreement page', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      gasRedirectResponse(412, '/agreements/current')
    )

    const response = await server.inject({
      method: 'POST',
      url: '/AGR_42/actions/anything?step=confirm&x-encrypted-auth=query-auth',
      headers: {
        'x-base-url': '/agreement',
        'content-type': 'application/x-www-form-urlencoded'
      },
      payload: formPayload({
        [actionTransportFieldNames.etag]: '"AGR_42:1"',
        [actionTransportFieldNames.idempotencyKey]:
          'a2f91696-bb4b-49fb-a731-672117fe03aa',
        arbitrary: 'value'
      })
    })

    expect(response.statusCode).toBe(303)
    expect(response.headers.location).toBe(
      '/agreement?x-encrypted-auth=query-auth'
    )
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch.mock.calls[0][0]).toBe(
      'http://gas.internal:3102/agreements/AGR_42/actions/anything?step=confirm'
    )
    expect(globalThis.fetch.mock.calls[0][1].redirect).toBe('manual')
  })

  test.each([
    ['an Agreement action', '/agreements/AGR_42/actions/anything'],
    ['another Agreement', '/agreements/AGR_99']
  ])(
    'rejects a stale 412 that points to %s',
    async (_description, location) => {
      globalThis.fetch.mockResolvedValueOnce(gasRedirectResponse(412, location))

      const response = await server.inject({
        method: 'POST',
        url: '/AGR_42/actions/anything',
        headers: {
          'x-encrypted-auth': 'auth',
          'content-type': 'application/x-www-form-urlencoded'
        },
        payload: formPayload({
          [actionTransportFieldNames.etag]: '"AGR_42:1"',
          [actionTransportFieldNames.idempotencyKey]:
            'a2f91696-bb4b-49fb-a731-672117fe03aa'
        })
      })

      expect(response.statusCode).toBe(502)
      expect(response.headers).not.toHaveProperty('location')
    }
  )

  test('header authentication wins over query authentication', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(actionPageModel(), '"AGR_42:1"')
    )

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/anything?x-encrypted-auth=query-auth',
      headers: { 'x-encrypted-auth': 'header-auth' }
    })

    expect(extractJwtPayload).toHaveBeenCalledWith('header-auth')
    expect(load(response.result)('form').attr('action')).toBe(
      '/AGR_42/actions/recalculate-anything'
    )
  })

  test('rejects an action request when authentication has no JWT payload', async () => {
    extractJwtPayload.mockReturnValue(undefined)

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/anything',
      headers: { 'x-encrypted-auth': 'invalid-auth' }
    })

    expect(response.statusCode).toBe(401)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test('rejects a GAS action page that has no ETag', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: vi.fn().mockResolvedValue(actionPageModel())
    })

    const response = await server.inject({
      method: 'GET',
      url: '/AGR_42/actions/anything',
      headers: { 'x-encrypted-auth': 'auth' }
    })

    expect(response.statusCode).toBe(502)
  })

  test('rejects an unexpected successful GAS POST response', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      gasPageResponse(actionPageModel(), '"AGR_42:2"', 201)
    )

    const response = await server.inject({
      method: 'POST',
      url: '/AGR_42/actions/anything',
      headers: {
        'x-encrypted-auth': 'auth',
        'content-type': 'application/x-www-form-urlencoded'
      },
      payload: formPayload({
        [actionTransportFieldNames.etag]: '"AGR_42:1"',
        [actionTransportFieldNames.idempotencyKey]:
          'a2f91696-bb4b-49fb-a731-672117fe03aa'
      })
    })

    expect(response.statusCode).toBe(502)
  })

  test.each([
    ['a missing Location', undefined],
    ['an external Location', 'https://example.com/agreements/AGR_42'],
    ['a malformed Location', 'http://']
  ])('rejects a GAS redirect with %s', async (_description, location) => {
    globalThis.fetch.mockResolvedValueOnce({
      ...gasRedirectResponse(303, location ?? ''),
      headers: location ? responseHeaders({ location }) : new Headers()
    })

    const response = await server.inject({
      method: 'POST',
      url: '/AGR_42/actions/anything',
      headers: {
        'x-encrypted-auth': 'auth',
        'content-type': 'application/x-www-form-urlencoded'
      },
      payload: formPayload({
        [actionTransportFieldNames.etag]: '"AGR_42:1"',
        [actionTransportFieldNames.idempotencyKey]:
          'a2f91696-bb4b-49fb-a731-672117fe03aa'
      })
    })

    expect(response.statusCode).toBe(502)
    expect(response.headers).not.toHaveProperty('location')
  })

  test.each([
    ['an empty form', ''],
    ['a form with ordinary values', formPayload({ confirm: 'confirmed' })]
  ])('rejects %s without transport metadata', async (_description, payload) => {
    const response = await server.inject({
      method: 'POST',
      url: '/AGR_42/actions/anything',
      headers: {
        'x-encrypted-auth': 'auth',
        'content-type': 'application/x-www-form-urlencoded'
      },
      payload
    })

    expect(response.statusCode).toBe(400)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test.each([
    ['application/json', JSON.stringify({ confirm: 'confirmed' })],
    [
      'multipart/form-data; boundary=review-boundary',
      '--review-boundary\r\nContent-Disposition: form-data; name="confirm"\r\n\r\nconfirmed\r\n--review-boundary--\r\n'
    ]
  ])('rejects %s action submissions', async (contentType, payload) => {
    const response = await server.inject({
      method: 'POST',
      url: '/AGR_42/actions/anything',
      headers: {
        'x-encrypted-auth': 'auth',
        'content-type': contentType
      },
      payload
    })

    expect(response.statusCode).toBe(415)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test('rejects an oversized browser form submission', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/AGR_42/actions/anything',
      headers: {
        'x-encrypted-auth': 'auth',
        'content-type': 'application/x-www-form-urlencoded'
      },
      payload: `field=${'x'.repeat(64 * 1024)}`
    })

    expect(response.statusCode).toBe(413)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test('does not proxy the new route for an Agreement selected for the legacy backend', async () => {
    extractJwtPayload.mockReturnValue({ grantCode: 'legacy-grant' })

    const response = await server.inject({
      method: 'GET',
      url: '/LEGACY123/actions/anything',
      headers: { 'x-encrypted-auth': 'legacy-auth' }
    })

    expect(response.statusCode).toBe(404)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})

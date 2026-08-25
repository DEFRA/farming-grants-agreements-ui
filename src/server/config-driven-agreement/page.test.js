import { load } from 'cheerio'
import { describe, expect, test, vi } from 'vitest'

import { nunjucksConfig } from '#~/config/nunjucks/nunjucks.js'
import { configDrivenAgreementController } from './controller.js'

const agreement = {
  applicant: {
    business: { name: 'Example Farm' },
    customer: { name: { first: 'Alex', last: 'Farmer' } }
  },
  identifiers: { sbi: '123456789' }
}

const renderGasAgreement = (renderModel) => {
  const environment = nunjucksConfig.options.compileOptions.environment
  let renderedPage
  const request = {
    pre: { data: { source: 'gas', agreement, ...renderModel } },
    headers: {}
  }
  const response = {
    header: vi.fn().mockReturnThis()
  }
  const h = {
    view: vi.fn((template, model) => {
      renderedPage = environment.render(`${template}.njk`, {
        ...nunjucksConfig.options.context,
        getAssetPath: () => '',
        buildUrl: (url) => url,
        ...model
      })
      return response
    })
  }

  configDrivenAgreementController.handler(request, h)
  return load(renderedPage)
}

const renderPageViewModel = (model) => {
  const environment = nunjucksConfig.options.compileOptions.environment
  return load(
    environment.render('config-driven-agreement/page.njk', {
      ...nunjucksConfig.options.context,
      getAssetPath: (_baseUrl, asset) => `/assets/${asset}`,
      buildUrl: (url) => url,
      agreement,
      baseUrl: '/',
      errors: [],
      components: [],
      formComponents: [],
      postActionComponents: [],
      sections: [],
      actions: [],
      layout: 'default',
      ...model
    })
  )
}

const agreementContent = [
  { component: 'heading', level: 1, text: 'Your agreement' },
  { component: 'paragraph', text: 'Agreement details' }
]

const defaultModel = {
  page: { title: 'Your agreement' },
  components: agreementContent,
  actions: []
}

const documentModel = {
  ...defaultModel,
  page: {
    ...defaultModel.page,
    layout: 'document',
    contents: true,
    print: true,
    watermark: {
      text: 'DRAFT'
    }
  },
  components: agreementContent,
  sections: [
    {
      id: 'agreement-overview',
      title: 'Agreement overview',
      components: [{ component: 'paragraph', text: 'Overview details' }]
    },
    {
      id: 'payment-schedule',
      title: 'Payment schedule',
      components: [{ component: 'paragraph', text: '6 November 2026 - £320' }]
    }
  ],
  actions: []
}

describe('config-driven GAS agreement page', () => {
  test('renders document content in the full-width layout', () => {
    const $ = renderGasAgreement(documentModel)
    const $content = $('.govuk-grid-column-full')

    expect($content).toHaveLength(1)
    expect($content.find('h1').text().trim()).toBe('Your agreement')
    expect($content.find('p').text().trim()).toBe('Agreement details')
    expect($('.govuk-grid-column-two-thirds')).toHaveLength(0)
  })

  test('renders document sections with a contents sidebar and print control', () => {
    const $ = renderGasAgreement(documentModel)
    const $contents = $('#contents')

    expect($contents.find('a')).toHaveLength(2)
    expect($contents.find('a').first().attr('href')).toBe('#agreement-overview')
    expect($contents.find('a').last().text().trim()).toBe('2. Payment schedule')
    expect($('#agreement-overview').text().trim()).toBe('1. Agreement overview')
    expect($('#payment-schedule').text().trim()).toBe('2. Payment schedule')
    expect($('.govuk-grid-column-three-quarters')).toHaveLength(1)
    expect($('[data-module="print-link"]').text().trim()).toBe(
      'Print this page'
    )
  })

  test('renders document sections full width when controls are disabled', () => {
    const $ = renderGasAgreement({
      ...documentModel,
      page: { ...documentModel.page, contents: false, print: false }
    })

    expect($('#contents')).toHaveLength(0)
    expect($('[data-module="print-link"]')).toHaveLength(0)
    expect($('section').parent('.govuk-grid-column-full')).toHaveLength(1)
  })

  test('uses the default two-thirds layout without watermark styling', () => {
    const $ = renderGasAgreement(defaultModel)

    expect($('.govuk-grid-column-two-thirds')).toHaveLength(1)
    expect($('.govuk-grid-column-full')).toHaveLength(0)
    expect($('body').hasClass('view-agreement-has-watermark')).toBe(false)
  })

  test('renders an accessible-hidden page watermark', () => {
    const $ = renderGasAgreement(documentModel)
    const $watermark = $('.print-watermark')

    expect($('body').hasClass('view-agreement-has-watermark')).toBe(true)
    expect($watermark.text().trim()).toBe('DRAFT')
    expect($watermark.attr('aria-hidden')).toBe('true')
  })

  test('renders a configured Back link inside main and before the heading', () => {
    const $ = renderPageViewModel({
      backHref: '/agreement/AGR-123?x-encrypted-auth=signed-token',
      components: agreementContent
    })
    const $main = $('main#main-content')
    const $backLink = $main.find('a.govuk-back-link')

    expect($backLink).toHaveLength(1)
    expect($backLink.attr('href')).toBe(
      '/agreement/AGR-123?x-encrypted-auth=signed-token'
    )
    expect($main.find('a.govuk-back-link, h1').first().is('a')).toBe(true)
  })

  test('keeps confirmation controls together and trailing content ahead of later actions', () => {
    const $ = renderPageViewModel({
      hasFormAction: true,
      hasConfirmationCheckbox: true,
      formComponents: [
        { component: 'heading', level: 1, text: 'Review the agreement' },
        {
          component: 'checkboxes',
          name: 'confirm',
          items: [{ value: 'confirmed', text: 'Confirm agreement' }]
        }
      ],
      postActionComponents: [
        {
          component: 'details',
          summaryItems: [{ component: 'text', text: 'Need help?' }],
          items: [{ component: 'paragraph', text: 'Contact us.' }]
        }
      ],
      transportMetadata: {
        etag: { name: '__etag', value: 'version-7' },
        idempotencyKey: { name: '__key', value: 'request-1' }
      },
      actions: [
        {
          renderAsForm: true,
          method: 'POST',
          action: '/agreement/AGR-123/actions/finalise',
          fields: [{ name: 'operation', value: 'finalise' }],
          text: 'Finalise agreement'
        },
        {
          renderAsForm: false,
          href: '/agreement/AGR-123/actions/other',
          text: 'Do something else'
        }
      ]
    })
    const $form = $('form')
    const $details = $('details.govuk-details')

    expect($form.find('input[name="confirm"]')).toHaveLength(1)
    expect($form.find('input[name="__etag"]').val()).toBe('version-7')
    expect($form.find('input[name="__key"]').val()).toBe('request-1')
    expect($form.find('input[name="operation"]').val()).toBe('finalise')
    expect($form.find('button#accept-offer-button')).toHaveLength(1)
    expect($form.next()[0]).toBe($details[0])
    expect($details.next('a.govuk-button').text().trim()).toBe(
      'Do something else'
    )
    expect($('script[src$="/accept-offer.js"]')).toHaveLength(1)
  })

  test('does not add confirmation behaviour or navigation to an unconfigured page', () => {
    const $ = renderPageViewModel({
      hasFormAction: true,
      formComponents: [
        { component: 'heading', level: 1, text: 'Other operation' },
        { component: 'checkboxes', name: 'approve', items: [] }
      ],
      actions: [
        {
          renderAsForm: true,
          method: 'POST',
          action: '/agreement/AGR-123/actions/other',
          text: 'Continue'
        }
      ]
    })

    expect($('a.govuk-back-link')).toHaveLength(0)
    expect($('#accept-offer-button')).toHaveLength(0)
    expect($('script[src$="/accept-offer.js"]')).toHaveLength(0)
  })

  test('keeps ordinary page components outside action forms', () => {
    const $ = renderGasAgreement({
      ...defaultModel,
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
          action: '/agreement',
          text: 'Continue'
        }
      ]
    })

    expect($('input[name="confirm"]')).toHaveLength(1)
    expect($('form input[name="confirm"]')).toHaveLength(0)
  })
})

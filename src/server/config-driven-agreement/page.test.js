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

const gridTree = (components, width = 'two-thirds') => [
  {
    component: 'grid-row',
    components: [{ component: 'grid-column', width, components }]
  }
]

const agreementContent = [
  { component: 'heading', level: 1, text: 'Your agreement' },
  { component: 'paragraph', text: 'Agreement details' }
]

const defaultModel = {
  page: { title: 'Your agreement' },
  components: gridTree(agreementContent)
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
  components: gridTree(agreementContent, 'full'),
  sections: [
    {
      id: 'agreement-overview',
      title: 'Agreement overview',
      components: gridTree(
        [{ component: 'paragraph', text: 'Overview details' }],
        'full'
      )
    },
    {
      id: 'payment-schedule',
      title: 'Payment schedule',
      components: gridTree(
        [{ component: 'paragraph', text: '6 November 2026 - £320' }],
        'full'
      )
    }
  ]
}

describe('config-driven GAS agreement page', () => {
  test('renders the configured Back link in the UI shell before agreement content', () => {
    const $ = renderGasAgreement({
      ...defaultModel,
      page: {
        ...defaultModel.page,
        backLink: { text: 'Back to offer', href: '/agreements/PMF123' }
      }
    })

    expect($('a.govuk-back-link').text().trim()).toBe('Back to offer')
    expect($('a.govuk-back-link').attr('href')).toBe('/PMF123')
  })

  test('renders document content in the full-width layout', () => {
    const $ = renderGasAgreement(documentModel)
    const $content = $('h1').closest('.govuk-grid-column-full')

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

  test('renders a GET action as the configured button in tree order', () => {
    const $ = renderGasAgreement({
      ...defaultModel,
      components: gridTree([
        { component: 'paragraph', text: 'Before action' },
        {
          component: 'button',
          href: '/agreements/PMF123/actions/accept',
          text: 'Accept agreement'
        },
        { component: 'details', summaryItems: [{ text: 'Help' }], items: [] }
      ])
    })

    expect($('p + a.govuk-button').text().trim()).toBe('Accept agreement')
    expect($('a.govuk-button + details')).toHaveLength(1)
  })

  test('renders a POST button inside its form and following content outside', () => {
    const $ = renderGasAgreement({
      ...defaultModel,
      components: gridTree([
        {
          component: 'form',
          method: 'POST',
          formAction: '/agreements/PMF123/actions/accept',
          hiddenFields: [],
          submissionRequirements: [{ name: 'confirm', value: 'confirmed' }],
          components: [
            {
              component: 'checkboxes',
              name: 'confirm',
              items: [{ value: 'confirmed', text: 'Confirm agreement' }]
            },
            { component: 'button', text: 'Continue', submit: true }
          ]
        },
        { component: 'paragraph', text: 'After the form' }
      ])
    })

    expect($('form input[name="confirm"]')).toHaveLength(1)
    expect(JSON.parse($('form').attr('data-submission-requirements'))).toEqual([
      { name: 'confirm', value: 'confirmed' }
    ])
    expect($('form button[type="submit"]').text().trim()).toBe('Continue')
    expect($('form p')).toHaveLength(0)
    expect($('form + p').text().trim()).toBe('After the form')
  })
})

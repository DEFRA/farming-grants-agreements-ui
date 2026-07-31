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
  page: { ...defaultModel.page, layout: 'document' },
  components: [
    ...agreementContent,
    {
      component: 'watermark',
      text: 'DRAFT',
      header: 'Draft Agreement',
      classes: 'custom-watermark'
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

  test('uses the default two-thirds layout without watermark styling', () => {
    const $ = renderGasAgreement(defaultModel)

    expect($('.govuk-grid-column-two-thirds')).toHaveLength(1)
    expect($('.govuk-grid-column-full')).toHaveLength(0)
    expect($('body').hasClass('view-agreement-has-watermark')).toBe(false)
  })

  test('renders an accessible-hidden watermark from top-level config', () => {
    const $ = renderGasAgreement(documentModel)
    const $watermark = $('.print-watermark')
    const $header = $('.print-watermark-header')

    expect($('body').hasClass('view-agreement-has-watermark')).toBe(true)
    expect($watermark.text().trim()).toBe('DRAFT')
    expect($watermark.hasClass('custom-watermark')).toBe(true)
    expect($watermark.attr('aria-hidden')).toBe('true')
    expect($header.text().trim()).toBe('Draft Agreement')
    expect($header.attr('aria-hidden')).toBe('true')
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

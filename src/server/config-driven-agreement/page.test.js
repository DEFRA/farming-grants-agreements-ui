import { load } from 'cheerio'
import { describe, expect, test, vi } from 'vitest'

import { nunjucksConfig } from '#~/config/nunjucks/nunjucks.js'
import {
  configDrivenAgreementController,
  renderConfigDrivenAgreement
} from './controller.js'

const agreement = {
  applicant: {
    business: { name: 'Example Farm' },
    customer: { name: { first: 'Alex', last: 'Farmer' } }
  },
  identifiers: { sbi: '123456789' }
}

const renderGasAgreement = (renderModel, transportMetadata) => {
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

  if (transportMetadata) {
    renderConfigDrivenAgreement(request, h, renderModel, transportMetadata)
  } else {
    configDrivenAgreementController.handler(request, h)
  }
  return load(renderedPage)
}

const tableComponent = {
  component: 'table',
  rows: [[{ text: 'Payment one' }]]
}

const detailsComponent = {
  component: 'details',
  summaryItems: [{ text: 'Update details' }],
  items: [{ text: 'Tell us about changes' }]
}

const continueAction = {
  method: 'POST',
  action: '/agreement',
  text: 'Continue'
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
  components: [
    { ...agreementContent[0], layout: 'full-width' },
    { ...agreementContent[1], insertActionsAfter: true }
  ],
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
    expect(
      $content
        .children('h1, p')
        .toArray()
        .map((element) => $(element).text().trim())
    ).toEqual(['Your agreement', 'Agreement details'])
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
    expect(
      $('.govuk-grid-column-two-thirds')
        .children('h1, p')
        .toArray()
        .map((element) => $(element).text().trim())
    ).toEqual(['Your agreement', 'Agreement details'])
  })

  test('renders an accessible-hidden page watermark', () => {
    const $ = renderGasAgreement(documentModel)
    const $watermark = $('.print-watermark')

    expect($('body').hasClass('view-agreement-has-watermark')).toBe(true)
    expect($watermark.text().trim()).toBe('DRAFT')
    expect($watermark.attr('aria-hidden')).toBe('true')
  })

  test('inserts actions after the first flagged component', () => {
    const $ = renderGasAgreement({
      ...defaultModel,
      components: [
        { component: 'heading', level: 1, text: 'Your agreement' },
        { ...tableComponent, insertActionsAfter: true },
        { ...detailsComponent, insertActionsAfter: true }
      ],
      actions: [continueAction]
    })
    const orderedElements = $('table, .govuk-button, details')

    expect(orderedElements).toHaveLength(3)
    expect(orderedElements.eq(0).is('table')).toBe(true)
    expect(orderedElements.eq(1).is('.govuk-button')).toBe(true)
    expect(orderedElements.eq(2).is('details')).toBe(true)
    expect(
      orderedElements.eq(1).closest('.govuk-grid-column-two-thirds')
    ).toHaveLength(1)
  })

  test('does not emit a trailing row when the final component is flagged', () => {
    const $ = renderGasAgreement({
      ...defaultModel,
      components: [
        { component: 'heading', level: 1, text: 'Your agreement' },
        { ...tableComponent, insertActionsAfter: true }
      ],
      actions: [continueAction]
    })

    expect($('#main-content > .govuk-grid-row')).toHaveLength(2)
    expect(
      $('#main-content > .govuk-grid-row').last().find('.govuk-button')
    ).toHaveLength(1)
  })

  test('does not emit a leading row without errors or a watermark', () => {
    const $ = renderGasAgreement({
      ...defaultModel,
      components: [{ ...tableComponent, layout: 'full-width' }]
    })

    expect($('#main-content > .govuk-grid-row')).toHaveLength(1)
    expect(
      $('#main-content > .govuk-grid-row')
        .first()
        .children('.govuk-grid-column-full')
    ).toHaveLength(1)
  })

  test('groups contiguous components by their opted-in widths', () => {
    const $ = renderGasAgreement({
      ...defaultModel,
      components: [
        { component: 'heading', level: 1, text: 'Your agreement' },
        { component: 'paragraph', text: 'Agreement details' },
        { ...tableComponent, layout: 'full-width' },
        detailsComponent,
        { component: 'paragraph', text: 'After details' }
      ]
    })
    const columns = $('#main-content > .govuk-grid-row > div')

    expect(
      columns.toArray().map((element) => $(element).attr('class'))
    ).toEqual([
      'govuk-grid-column-two-thirds',
      'govuk-grid-column-full',
      'govuk-grid-column-two-thirds'
    ])
    expect(columns.eq(0).find('h1, p')).toHaveLength(2)
    expect(columns.eq(1).find('table')).toHaveLength(1)
    expect(columns.eq(2).find('details, p')).toHaveLength(2)
  })

  test('keeps flagged form pages on the legacy form path with transport metadata', () => {
    const transportMetadata = {
      etag: { name: 'etag', value: 'agreement-etag' },
      idempotencyKey: {
        name: 'idempotencyKey',
        value: 'agreement-idempotency-key'
      }
    }
    const $ = renderGasAgreement(
      {
        ...defaultModel,
        components: [
          { ...tableComponent, insertActionsAfter: true, layout: 'full-width' },
          detailsComponent
        ],
        actions: [continueAction]
      },
      transportMetadata
    )
    const orderedElements = $('form table, form details, form .govuk-button')

    expect($('#main-content > .govuk-grid-row')).toHaveLength(1)
    expect(
      $('#main-content > .govuk-grid-row > .govuk-grid-column-two-thirds')
    ).toHaveLength(1)
    expect(orderedElements.toArray().map((element) => element.tagName)).toEqual(
      ['table', 'details', 'button']
    )
    expect($('input[name="etag"]').val()).toBe('agreement-etag')
    expect($('input[name="idempotencyKey"]').val()).toBe(
      'agreement-idempotency-key'
    )
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

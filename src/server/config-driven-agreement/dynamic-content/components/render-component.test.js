import { load } from 'cheerio'
import nunjucks from 'nunjucks'
import { describe, expect, it } from 'vitest'

const environment = nunjucks.configure(
  ['node_modules/govuk-frontend/dist', 'src/server'],
  { autoescape: true }
)

const renderComponent = (component) =>
  environment.renderString(
    `{% from "config-driven-agreement/dynamic-content/components/render-component.njk" import renderDefraComponent %}{{ renderDefraComponent(component) }}`,
    { component }
  )

describe('Agreement component renderer', () => {
  it('passes a checkbox component model to GOV.UK without deriving its checked state', () => {
    const html = renderComponent({
      component: 'checkboxes',
      name: 'confirm',
      hint: { text: 'Read the agreement before confirming' },
      items: [
        {
          value: 'confirmed',
          text: 'I confirm I accept this agreement offer.',
          checked: false
        },
        {
          value: 'reminder',
          text: 'Send me a reminder.',
          checked: true
        }
      ]
    })
    const $ = load(html)
    const checkbox = $('input.govuk-checkboxes__input')

    expect(checkbox).toHaveLength(2)
    expect(checkbox.first().attr('name')).toBe('confirm')
    expect(checkbox.first().attr('value')).toBe('confirmed')
    expect(checkbox.first().is(':checked')).toBe(false)
    expect(checkbox.last().attr('value')).toBe('reminder')
    expect(checkbox.last().is(':checked')).toBe(true)
    expect($('.govuk-hint').text()).toContain(
      'Read the agreement before confirming'
    )
    expect($('label.govuk-checkboxes__label').text()).toContain(
      'I confirm I accept this agreement offer.'
    )
  })

  it.each([
    ['text', { text: 'Text' }, 'body'],
    ['paragraph', { text: 'Paragraph' }, 'p.govuk-body'],
    ['url', { href: '/agreement', text: 'Agreement' }, 'a'],
    ['status', { text: 'offered' }, '.govuk-tag'],
    ['heading', { text: 'Heading', level: 2 }, 'h2'],
    [
      'summary-list',
      { rows: [{ label: 'Agreement', text: 'PMF123' }] },
      '.govuk-summary-list'
    ],
    ['unordered-list', { items: [{ text: 'Item' }] }, 'ul'],
    ['ordered-list', { items: [{ text: 'Item' }] }, 'ol'],
    ['table', { rows: [[{ text: 'Cell' }]] }, '.govuk-table'],
    ['container', { items: [{ text: 'Item' }] }, '.defra-container'],
    [
      'details',
      {
        summaryItems: [{ text: 'Summary' }],
        items: [{ text: 'Details' }]
      },
      'details.govuk-details'
    ],
    [
      'accordion',
      {
        id: 'agreement-sections',
        items: [{ heading: [{ text: 'Section' }], content: [] }]
      },
      '.govuk-accordion'
    ],
    ['line-break', {}, 'br'],
    ['warning-text', { text: 'Warning' }, '.govuk-warning-text'],
    [
      'notification-banner',
      { title: 'Important', items: [] },
      '.govuk-notification-banner'
    ],
    ['panel', { title: 'Complete', text: 'Done' }, '.govuk-panel']
  ])('renders the registered %s component', (component, params, selector) => {
    const $ = load(renderComponent({ component, ...params }))

    expect($(selector)).toHaveLength(1)
  })
})

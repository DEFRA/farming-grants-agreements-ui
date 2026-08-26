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

  it('renders an explicit grid tree', () => {
    const $ = load(
      renderComponent({
        component: 'grid-row',
        components: [
          {
            component: 'grid-column',
            width: 'full',
            components: [{ component: 'paragraph', text: 'Grid content' }]
          }
        ]
      })
    )

    expect($('.govuk-grid-row > .govuk-grid-column-full > p').text()).toBe(
      'Grid content'
    )
  })

  it.each([
    [{ href: '/accept', text: 'Accept agreement' }, 'a', '/accept'],
    [{ text: 'Accept agreement', submit: true }, 'button', undefined]
  ])('renders a resolved button', (params, element, href) => {
    const $ = load(renderComponent({ component: 'button', ...params }))
    const button = $(`${element}.govuk-button`)

    expect(button).toHaveLength(1)
    expect(button.text().trim()).toBe('Accept agreement')
    expect(button.attr('href')).toBe(href)
  })

  it('renders only configured children and hidden fields inside a form', () => {
    const html = environment.renderString(
      `{% from "config-driven-agreement/dynamic-content/components/render-component.njk" import renderDefraComponent %}{{ renderDefraComponent(component) }}<p id="after">After</p>`,
      {
        component: {
          component: 'form',
          method: 'POST',
          formAction: '/accept',
          hiddenFields: [{ name: 'etag', value: 'version-1' }],
          submissionRequirements: [{ name: 'confirm', value: 'confirmed' }],
          components: [{ component: 'button', text: 'Accept', submit: true }]
        }
      }
    )
    const $ = load(html)

    expect($('form').attr('method')).toBe('POST')
    expect($('form').attr('action')).toBe('/accept')
    expect($('form input[name="etag"]').attr('value')).toBe('version-1')
    expect(JSON.parse($('form').attr('data-submission-requirements'))).toEqual([
      { name: 'confirm', value: 'confirmed' }
    ])
    expect($('form > button[type="submit"]')).toHaveLength(1)
    expect($('form #after')).toHaveLength(0)
    expect($('form + #after')).toHaveLength(1)
  })

  it('does not insert a space before punctuation in adjacent text', () => {
    const $ = load(
      renderComponent({
        component: 'paragraph',
        items: [
          { component: 'text', text: 'Alex Farmer' },
          { component: 'text', text: ', of Example Farm' }
        ]
      })
    )

    expect($('p').text()).toBe('Alex Farmer, of Example Farm')
  })

  it('does not insert a space between a link and following punctuation', () => {
    const $ = load(
      renderComponent({
        component: 'paragraph',
        items: [
          { component: 'text', text: 'Read ' },
          { component: 'url', text: 'the terms', href: '/terms' },
          { component: 'text', text: ', then continue.' }
        ]
      })
    )

    expect($('p').text()).toBe('Read the terms, then continue.')
  })

  it('preserves configured spaces around a link', () => {
    const $ = load(
      renderComponent({
        component: 'paragraph',
        items: [
          { component: 'text', text: 'Read ' },
          { component: 'url', text: 'terms', href: '/x' },
          { component: 'text', text: ' now' }
        ]
      })
    )

    expect($('p').text()).toBe('Read terms now')
  })

  it('keeps URL labels escaped and link attributes unchanged', () => {
    const $ = load(
      renderComponent({
        component: 'paragraph',
        items: [
          {
            component: 'url',
            text: 'Terms & <em>Conditions</em>',
            href: '/terms?farm=A&B',
            target: '_blank'
          }
        ]
      })
    )
    const link = $('a')

    expect(link.text()).toBe('Terms & <em>Conditions</em>')
    expect(link.attr('href')).toBe('/terms?farm=A&B')
    expect(link.attr('target')).toBe('_blank')
    expect(link.attr('rel')).toBe('noopener noreferrer')
    expect(link.find('em')).toHaveLength(0)
  })

  it('preserves a semantic line break between inline text components', () => {
    const $ = load(
      renderComponent({
        component: 'paragraph',
        items: [
          { component: 'text', text: 'A' },
          { component: 'line-break' },
          { component: 'text', text: 'B' }
        ]
      })
    )
    const paragraph = $('p')

    expect(paragraph.children('span')).toHaveLength(2)
    expect(paragraph.children('br')).toHaveLength(1)
    expect(
      paragraph
        .children()
        .map((_index, element) => element.tagName)
        .get()
    ).toEqual(['span', 'br', 'span'])
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
    [
      'description-list',
      {
        classes: 'dataset-info',
        rows: [
          {
            label: { text: 'Agreement', classes: 'label' },
            value: { text: 'WMP123', classes: 'value' }
          }
        ]
      },
      'dl.dataset-info > dt.label + dd.value'
    ],
    ['unordered-list', { items: [{ text: 'Item' }] }, 'ul'],
    ['ordered-list', { items: [{ text: 'Item' }] }, 'ol'],
    [
      'table',
      {
        classes: 'govuk-table--small-text-until-tablet',
        rows: [[{ text: 'Cell' }]]
      },
      '.govuk-table.govuk-table--small-text-until-tablet'
    ],
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

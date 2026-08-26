import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JSDOM } from 'jsdom'

const createAllMock = vi.fn()
const govukComponents = {
  Button: Symbol('Button'),
  Checkboxes: Symbol('Checkboxes'),
  ErrorSummary: Symbol('ErrorSummary'),
  Header: Symbol('Header'),
  Radios: Symbol('Radios'),
  SkipLink: Symbol('SkipLink')
}

vi.mock('govuk-frontend', () => ({
  createAll: createAllMock,
  ...govukComponents
}))

let dom

const setDomContent = (body = '') => {
  if (dom) {
    dom.window.close()
  }
  dom = new JSDOM(`<!DOCTYPE html><html><body>${body}</body></html>`, {
    url: 'http://localhost'
  })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.Event = dom.window.Event
}

beforeEach(() => {
  createAllMock.mockClear()
  if (dom) {
    dom.window.close()
    dom = null
  }
  delete globalThis.window
  delete globalThis.document
  delete globalThis.print
  delete globalThis.Event
})

afterEach(() => {
  if (dom) {
    dom.window.close()
    dom = null
  }
  delete globalThis.window
  delete globalThis.document
  delete globalThis.print
  delete globalThis.Event
})

const loadApplication = async () => {
  vi.resetModules()
  await import('./application.js')
}

describe('application.js', () => {
  it('initialises govuk-frontend components once', async () => {
    setDomContent()

    await loadApplication()

    expect(createAllMock).toHaveBeenCalledTimes(6)
    expect(createAllMock).toHaveBeenNthCalledWith(1, govukComponents.Button)
    expect(createAllMock).toHaveBeenNthCalledWith(2, govukComponents.Checkboxes)
    expect(createAllMock).toHaveBeenNthCalledWith(
      3,
      govukComponents.ErrorSummary
    )
    expect(createAllMock).toHaveBeenNthCalledWith(4, govukComponents.Header)
    expect(createAllMock).toHaveBeenNthCalledWith(5, govukComponents.Radios)
    expect(createAllMock).toHaveBeenNthCalledWith(6, govukComponents.SkipLink)
  })

  it('progressively enables a form submit control when its requirements are met', async () => {
    setDomContent(`
      <form data-submission-requirements='[{"name":"confirm","value":"confirmed"}]'>
        <input type="checkbox" name="confirm" value="confirmed">
        <button type="submit">Accept</button>
      </form>
    `)

    await loadApplication()
    document.dispatchEvent(new globalThis.Event('DOMContentLoaded'))

    const checkbox = document.querySelector('input[name="confirm"]')
    const button = document.querySelector('button[type="submit"]')

    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-disabled')).toBe('true')

    checkbox.checked = true
    checkbox.dispatchEvent(new globalThis.Event('change', { bubbles: true }))

    expect(button.disabled).toBe(false)
    expect(button.getAttribute('aria-disabled')).toBe('false')
  })

  it('supports text and multi-select submission requirements', async () => {
    setDomContent(`
      <form data-submission-requirements='[{"name":"declaration","value":"agreed"},{"name":"actions","value":"one"}]'>
        <input name="unrelated" value="ignored">
        <input name="declaration" value="">
        <select name="actions" multiple>
          <option value="one">One</option>
          <option value="two">Two</option>
        </select>
        <button type="submit">Continue</button>
      </form>
    `)

    await loadApplication()
    document.dispatchEvent(new globalThis.Event('DOMContentLoaded'))

    const declaration = document.querySelector('input[name="declaration"]')
    const select = document.querySelector('select[name="actions"]')
    const button = document.querySelector('button[type="submit"]')

    declaration.value = 'agreed'
    select.options[0].selected = true
    select.dispatchEvent(new globalThis.Event('change', { bubbles: true }))

    expect(button.disabled).toBe(false)
  })

  it('leaves malformed requirement metadata without client-side enhancement', async () => {
    setDomContent(`
      <form data-submission-requirements='not-json'>
        <button type="submit">Continue</button>
      </form>
      <form data-submission-requirements='{}'>
        <button type="submit">Continue</button>
      </form>
    `)

    await loadApplication()
    document.dispatchEvent(new globalThis.Event('DOMContentLoaded'))

    expect(document.querySelectorAll('button[type="submit"]')).toHaveLength(2)
    document
      .querySelectorAll('button[type="submit"]')
      .forEach((button) => expect(button.disabled).toBe(false))
  })

  it('converts gem print buttons to type button and wires print events', async () => {
    setDomContent(`
      <button class="gem-c-print-link__button" type="submit">Print page</button>
      <a data-module="print-link" href="/print">Link</a>
    `)

    globalThis.print = vi.fn()

    await loadApplication()

    document.dispatchEvent(new globalThis.Event('DOMContentLoaded'))

    const button = document.querySelector('.gem-c-print-link__button')
    const link = document.querySelector('[data-module="print-link"]')

    expect(button.type).toBe('button')

    const buttonClick = new globalThis.Event('click', {
      bubbles: true,
      cancelable: true
    })
    button.dispatchEvent(buttonClick)

    expect(buttonClick.defaultPrevented).toBe(true)
    expect(globalThis.print).toHaveBeenCalledTimes(1)

    const linkClick = new globalThis.Event('click', {
      bubbles: true,
      cancelable: true
    })
    link.dispatchEvent(linkClick)

    expect(linkClick.defaultPrevented).toBe(true)
    expect(globalThis.print).toHaveBeenCalledTimes(2)
    expect(globalThis.print).toHaveBeenCalledWith()
  })
})

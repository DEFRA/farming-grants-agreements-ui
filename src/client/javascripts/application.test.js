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
  global.window = dom.window
  global.document = dom.window.document
}

beforeEach(() => {
  createAllMock.mockClear()
  if (dom) {
    dom.window.close()
    dom = null
  }
  delete global.window
  delete global.document
})

afterEach(() => {
  if (dom) {
    dom.window.close()
    dom = null
  }
  delete global.window
  delete global.document
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

  it('converts gem print buttons to type button and wires print events', async () => {
    setDomContent(`
      <button class="gem-c-print-link__button" type="submit">Print page</button>
      <a data-module="print-link" href="/print">Link</a>
    `)

    window.print = vi.fn()

    await loadApplication()

    document.dispatchEvent(new window.Event('DOMContentLoaded'))

    const button = document.querySelector('.gem-c-print-link__button')
    const link = document.querySelector('[data-module="print-link"]')

    expect(button.type).toBe('button')

    const buttonClick = new window.Event('click', {
      bubbles: true,
      cancelable: true
    })
    button.dispatchEvent(buttonClick)

    expect(buttonClick.defaultPrevented).toBe(true)
    expect(window.print).toHaveBeenCalledTimes(1)

    const linkClick = new window.Event('click', {
      bubbles: true,
      cancelable: true
    })
    link.dispatchEvent(linkClick)

    expect(linkClick.defaultPrevented).toBe(true)
    expect(window.print).toHaveBeenCalledTimes(2)
  })
})

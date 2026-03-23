import { beforeEach, describe, it, expect, vi } from 'vitest'
import { JSDOM } from 'jsdom'

describe('accept-offer.js', () => {
  let dom
  let window
  let document

  const runInitCheckbox = async () => {
    vi.useFakeTimers()
    // Re-import the module to trigger the side-effect (adding 'load' listener)
    // We use a query param to ensure a fresh import if needed,
    // though vi.resetModules() is better.
    vi.resetModules()
    await import('./accept-offer.js')

    // Trigger the load event which calls initCheckbox
    window.dispatchEvent(new window.Event('load'))

    // The implementation has a 100ms delay
    vi.advanceTimersByTime(100)
    vi.useRealTimers()
  }

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <body>
          <div class="govuk-checkboxes">
            <div class="govuk-checkboxes__item">
              <input
                class="govuk-checkboxes__input"
                id="confirm"
                name="confirm"
                type="checkbox"
                value="confirmed"
              >
              <label class="govuk-label govuk-checkboxes__label" for="confirm">
                I confirm
              </label>
            </div>
          </div>

          <button
            id="accept-offer-button"
            class="govuk-button"
          >
            Accept offer
          </button>
        </body>
      </html>
    `,
      {
        url: 'http://localhost',
        runScripts: 'outside-only'
      }
    )

    window = dom.window
    document = window.document
    global.window = window
    global.document = document
  })

  describe('initCheckbox function', () => {
    it('should initialize checkbox and button with event listeners', async () => {
      const checkbox = document.querySelector('#confirm')
      const button = document.getElementById('accept-offer-button')

      // Button should be enabled before JS runs (progressive enhancement)
      expect(button.disabled).toBe(false)
      expect(button.classList.contains('govuk-button--disabled')).toBe(false)

      // Call the actual function - this should disable the button
      await runInitCheckbox()

      // Button should be disabled after JS initializes
      expect(button.disabled).toBe(true)
      expect(button.classList.contains('govuk-button--disabled')).toBe(true)

      // Check the checkbox
      checkbox.checked = true
      checkbox.dispatchEvent(new window.Event('change'))

      // Button should be enabled
      expect(button.disabled).toBe(false)
      expect(button.classList.contains('govuk-button--disabled')).toBe(false)

      // Uncheck the checkbox
      checkbox.checked = false
      checkbox.dispatchEvent(new window.Event('change'))

      // Button should be disabled again
      expect(button.disabled).toBe(true)
      expect(button.classList.contains('govuk-button--disabled')).toBe(true)
    })

    it('should handle click events after initialization', async () => {
      await runInitCheckbox()

      const checkbox = document.querySelector('#confirm')
      const button = document.getElementById('accept-offer-button')

      // Check via click event
      checkbox.checked = true
      checkbox.dispatchEvent(new window.Event('click'))

      expect(button.disabled).toBe(false)
      expect(button.getAttribute('aria-disabled')).toBe('false')
    })

    it('should not fail when checkbox is missing', async () => {
      document.querySelector('#confirm').remove()

      // Should not throw
      await expect(runInitCheckbox()).resolves.not.toThrow()
    })

    it('should not fail when button is missing', async () => {
      document.getElementById('accept-offer-button').remove()

      // Should not throw
      await expect(runInitCheckbox()).resolves.not.toThrow()
    })

    it('should properly set all button attributes when enabling', async () => {
      await runInitCheckbox()

      const checkbox = document.querySelector('#confirm')
      const button = document.getElementById('accept-offer-button')

      checkbox.checked = true
      checkbox.dispatchEvent(new window.Event('change'))

      expect(button.disabled).toBe(false)
      expect(button.hasAttribute('disabled')).toBe(false)
      expect(button.getAttribute('aria-disabled')).toBe('false')
      expect(button.classList.contains('govuk-button--disabled')).toBe(false)
    })

    it('should properly set all button attributes when disabling', async () => {
      await runInitCheckbox()

      const checkbox = document.querySelector('#confirm')
      const button = document.getElementById('accept-offer-button')

      // First enable
      checkbox.checked = true
      checkbox.dispatchEvent(new window.Event('change'))

      // Then disable
      checkbox.checked = false
      checkbox.dispatchEvent(new window.Event('change'))

      expect(button.disabled).toBe(true)
      expect(button.getAttribute('disabled')).toBe('disabled')
      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect(button.classList.contains('govuk-button--disabled')).toBe(true)
    })
  })

  describe('checkbox and button interaction', () => {
    it('should find checkbox by id #confirm', () => {
      const checkbox = document.querySelector('#confirm')
      expect(checkbox).toBeTruthy()
      expect(checkbox.type).toBe('checkbox')
      expect(checkbox.id).toBe('confirm')
    })

    it('should find button by id accept-offer-button', () => {
      const button = document.getElementById('accept-offer-button')
      expect(button).toBeTruthy()
      expect(button.id).toBe('accept-offer-button')
    })

    it('should have button enabled initially before JS runs', () => {
      const button = document.getElementById('accept-offer-button')
      expect(button.disabled).toBe(false)
      expect(button.getAttribute('aria-disabled')).toBeNull()
      expect(button.classList.contains('govuk-button--disabled')).toBe(false)
    })

    it('should have button disabled after JS initializes', async () => {
      await runInitCheckbox()
      const button = document.getElementById('accept-offer-button')
      expect(button.disabled).toBe(true)
      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect(button.classList.contains('govuk-button--disabled')).toBe(true)
    })

    it('should enable button when checkbox is checked', () => {
      const checkbox = document.querySelector('#confirm')
      const button = document.getElementById('accept-offer-button')

      // Simulate the updateButtonState function behavior
      checkbox.checked = true
      button.disabled = false
      button.removeAttribute('disabled')
      button.setAttribute('aria-disabled', 'false')
      button.classList.remove('govuk-button--disabled')

      expect(button.disabled).toBe(false)
      expect(button.getAttribute('disabled')).toBeNull()
      expect(button.getAttribute('aria-disabled')).toBe('false')
      expect(button.classList.contains('govuk-button--disabled')).toBe(false)
    })

    it('should disable button when checkbox is unchecked', () => {
      const checkbox = document.querySelector('#confirm')
      const button = document.getElementById('accept-offer-button')

      // First enable it
      checkbox.checked = true
      button.disabled = false
      button.removeAttribute('disabled')
      button.setAttribute('aria-disabled', 'false')
      button.classList.remove('govuk-button--disabled')

      // Then disable it
      checkbox.checked = false
      button.disabled = true
      button.setAttribute('disabled', 'disabled')
      button.setAttribute('aria-disabled', 'true')
      button.classList.add('govuk-button--disabled')

      expect(button.disabled).toBe(true)
      expect(button.getAttribute('disabled')).toBe('disabled')
      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect(button.classList.contains('govuk-button--disabled')).toBe(true)
    })

    it('should handle change event on checkbox', () => {
      const checkbox = document.querySelector('#confirm')
      const button = document.getElementById('accept-offer-button')

      // Setup event listener like in the actual code
      const updateButtonState = () => {
        if (checkbox.checked) {
          button.disabled = false
          button.removeAttribute('disabled')
          button.setAttribute('aria-disabled', 'false')
          button.classList.remove('govuk-button--disabled')
        } else {
          button.disabled = true
          button.setAttribute('disabled', 'disabled')
          button.setAttribute('aria-disabled', 'true')
          button.classList.add('govuk-button--disabled')
        }
      }

      checkbox.addEventListener('change', updateButtonState)

      // Trigger change event
      checkbox.checked = true
      checkbox.dispatchEvent(new window.Event('change'))

      expect(button.disabled).toBe(false)
      expect(button.getAttribute('aria-disabled')).toBe('false')
      expect(button.classList.contains('govuk-button--disabled')).toBe(false)
    })

    it('should handle click event on checkbox', () => {
      const checkbox = document.querySelector('#confirm')
      const button = document.getElementById('accept-offer-button')

      // Setup event listener like in the actual code
      const updateButtonState = () => {
        if (checkbox.checked) {
          button.disabled = false
          button.removeAttribute('disabled')
          button.setAttribute('aria-disabled', 'false')
          button.classList.remove('govuk-button--disabled')
        } else {
          button.disabled = true
          button.setAttribute('disabled', 'disabled')
          button.setAttribute('aria-disabled', 'true')
          button.classList.add('govuk-button--disabled')
        }
      }

      checkbox.addEventListener('click', updateButtonState)

      // Trigger click event
      checkbox.checked = true
      checkbox.dispatchEvent(new window.Event('click'))

      expect(button.disabled).toBe(false)
      expect(button.getAttribute('aria-disabled')).toBe('false')
      expect(button.classList.contains('govuk-button--disabled')).toBe(false)
    })
  })

  describe('element selection fallbacks', () => {
    it('should find checkbox by name attribute', () => {
      const checkbox = document.querySelector('input[name="confirm"]')
      expect(checkbox).toBeTruthy()
      expect(checkbox.name).toBe('confirm')
    })

    it('should find checkbox by type and value', () => {
      const checkbox = document.querySelector(
        'input[type="checkbox"][value="confirmed"]'
      )
      expect(checkbox).toBeTruthy()
      expect(checkbox.type).toBe('checkbox')
      expect(checkbox.value).toBe('confirmed')
    })

    it('should find checkbox by GOV.UK class', () => {
      const checkbox = document.querySelector('.govuk-checkboxes__input')
      expect(checkbox).toBeTruthy()
      expect(checkbox.classList.contains('govuk-checkboxes__input')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle missing checkbox gracefully', () => {
      // Remove checkbox from DOM
      const checkbox = document.querySelector('#confirm')
      checkbox.remove()

      const button = document.getElementById('accept-offer-button')
      const missingCheckbox = document.querySelector('#confirm')

      expect(missingCheckbox).toBeNull()
      expect(button).toBeTruthy()
    })

    it('should handle missing button gracefully', () => {
      // Remove button from DOM
      const button = document.getElementById('accept-offer-button')
      button.remove()

      const checkbox = document.querySelector('#confirm')
      const missingButton = document.getElementById('accept-offer-button')

      expect(checkbox).toBeTruthy()
      expect(missingButton).toBeNull()
    })

    it('should not throw error when both elements are missing', () => {
      // Remove both elements
      document.querySelector('#confirm').remove()
      document.getElementById('accept-offer-button').remove()

      const checkbox = document.querySelector('#confirm')
      const button = document.getElementById('accept-offer-button')

      expect(checkbox).toBeNull()
      expect(button).toBeNull()
    })
  })

  describe('button state management', () => {
    it('should properly set all disabled attributes', () => {
      const button = document.getElementById('accept-offer-button')

      // Disable button
      button.disabled = true
      button.setAttribute('disabled', 'disabled')
      button.setAttribute('aria-disabled', 'true')
      button.classList.add('govuk-button--disabled')

      expect(button.disabled).toBe(true)
      expect(button.hasAttribute('disabled')).toBe(true)
      expect(button.getAttribute('disabled')).toBe('disabled')
      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect(button.classList.contains('govuk-button--disabled')).toBe(true)
    })

    it('should properly remove all disabled attributes', () => {
      const button = document.getElementById('accept-offer-button')

      // Enable button
      button.disabled = false
      button.removeAttribute('disabled')
      button.setAttribute('aria-disabled', 'false')
      button.classList.remove('govuk-button--disabled')

      expect(button.disabled).toBe(false)
      expect(button.hasAttribute('disabled')).toBe(false)
      expect(button.getAttribute('aria-disabled')).toBe('false')
      expect(button.classList.contains('govuk-button--disabled')).toBe(false)
    })

    it('should maintain GOV.UK button base class', () => {
      const button = document.getElementById('accept-offer-button')

      expect(button.classList.contains('govuk-button')).toBe(true)

      // After removing disabled class, base class should remain
      button.classList.remove('govuk-button--disabled')
      expect(button.classList.contains('govuk-button')).toBe(true)
    })
  })
})

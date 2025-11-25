// Accept offer page - conditional button based on checkbox

const DISABLED_BUTTON_CLASS = 'govuk-button--disabled'
const ARIA_DISABLED_ATTR = 'aria-disabled'

/**
 * Initialize checkbox-to-button functionality
 * Exported for testing purposes
 */
export function initCheckbox() {
  // GOV.UK checkboxes component generates input with id based on name
  const checkbox =
    document.querySelector('#confirm') ||
    document.querySelector('input[name="confirm"]') ||
    document.querySelector('input[type="checkbox"][value="confirmed"]') ||
    document.querySelector('.govuk-checkboxes__input')
  const button = document.getElementById('accept-offer-button')

  if (checkbox && button) {
    // Function to update button state
    const updateButtonState = function () {
      if (checkbox.checked) {
        button.disabled = false
        button.removeAttribute('disabled')
        button.setAttribute(ARIA_DISABLED_ATTR, 'false')
        button.classList.remove(DISABLED_BUTTON_CLASS)
      } else {
        button.disabled = true
        button.setAttribute('disabled', 'disabled')
        button.setAttribute(ARIA_DISABLED_ATTR, 'true')
        button.classList.add(DISABLED_BUTTON_CLASS)
      }
    }

    // Disable button initially when JS is available (progressive enhancement)
    // This ensures the button works without JS but is controlled by checkbox when JS is enabled
    button.disabled = true
    button.setAttribute('disabled', 'disabled')
    button.setAttribute(ARIA_DISABLED_ATTR, 'true')
    button.classList.add(DISABLED_BUTTON_CLASS)

    // Update button state based on current checkbox state
    updateButtonState()

    // Add event listeners
    checkbox.addEventListener('change', updateButtonState)
    checkbox.addEventListener('click', updateButtonState)
  }
}

// Auto-initialize when loaded in browser
/* c8 ignore start */
if (globalThis.window !== undefined) {
  // Wait for both DOM and GOV.UK Frontend to be ready
  globalThis.window.addEventListener('load', function () {
    // Add small delay to ensure GOV.UK Frontend has initialized
    setTimeout(initCheckbox, 100)
  })
}
/* c8 ignore stop */

// Accept offer page - conditional button based on checkbox
;(function () {
  // Wait for both DOM and GOV.UK Frontend to be ready
  window.addEventListener('load', function () {
    // Add small delay to ensure GOV.UK Frontend has initialized
    setTimeout(initCheckbox, 100)
  })

  function initCheckbox() {
    // GOV.UK checkboxes component generates input with id based on name
    const checkbox =
      document.querySelector('#confirm') ||
      document.querySelector('input[name="confirm"]') ||
      document.querySelector('input[type="checkbox"][value="confirmed"]') ||
      document.querySelector('.govuk-checkboxes__input')
    const button = document.getElementById('accept-offer-button')

    if (checkbox && button) {
      // Function to update button state
      function updateButtonState() {
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

      // Ensure button is disabled initially
      updateButtonState()

      // Add event listeners
      checkbox.addEventListener('change', updateButtonState)
      checkbox.addEventListener('click', updateButtonState)
    }
  }
})()

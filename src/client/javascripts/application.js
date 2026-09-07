import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Header,
  Radios,
  SkipLink
} from 'govuk-frontend'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)

const requirementIsSatisfied = (form, { name, value }) =>
  Array.from(form.elements).some((control) => {
    if (control.name !== name) {
      return false
    }

    if (control.type === 'select-multiple') {
      return Array.from(control.selectedOptions).some(
        (option) => option.value === value
      )
    }

    if (control.type === 'checkbox' || control.type === 'radio') {
      return control.checked && control.value === value
    }

    return control.value === value
  })

const setSubmitControlsEnabled = (form, enabled) => {
  form
    .querySelectorAll(
      'button:not([type]), button[type="submit"], input[type="submit"]'
    )
    .forEach((control) => {
      control.disabled = !enabled
      control.setAttribute('aria-disabled', String(!enabled))
      control.classList.toggle('govuk-button--disabled', !enabled)
    })
}

const initialiseSubmissionRequirements = (form) => {
  let requirements

  try {
    requirements = JSON.parse(form.dataset.submissionRequirements)
  } catch {
    return
  }

  if (!Array.isArray(requirements)) {
    return
  }

  const updateSubmitControls = () => {
    setSubmitControlsEnabled(
      form,
      requirements.every((requirement) =>
        requirementIsSatisfied(form, requirement)
      )
    )
  }

  form.addEventListener('change', updateSubmitControls)
  form.addEventListener('input', updateSubmitControls)
  updateSubmitControls()
}

document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelectorAll('form[data-submission-requirements]')
    .forEach(initialiseSubmissionRequirements)

  const printElements = document.querySelectorAll(
    '.gem-c-print-link__button, [data-module="print-link"]'
  )
  printElements.forEach((element) => {
    if (element.tagName === 'BUTTON') {
      element.type = 'button'
    }
    element.addEventListener('click', (e) => {
      e.preventDefault()
      globalThis.print()
    })
  })
})

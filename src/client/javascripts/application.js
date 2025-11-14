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

document.addEventListener('DOMContentLoaded', () => {
  const printElements = document.querySelectorAll(
    '.gem-c-print-link__button, [data-module="print-link"]'
  )
  printElements.forEach((element) => {
    if (element.tagName === 'BUTTON') {
      element.type = 'button'
    }
    element.addEventListener('click', (e) => {
      e.preventDefault()
      window.print()
    })
  })
})

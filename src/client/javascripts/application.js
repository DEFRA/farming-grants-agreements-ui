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
  const btn = document.querySelector('.gem-c-print-link__button')
  if (!btn) {
    return
  }
  btn.type = 'button'
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    window.print()
  })
})

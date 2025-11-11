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

// Robust print handling: avoid inline style overrides and DOM injection.
// Instead, toggle a body class to force repaint of print-only elements.
function activatePrintState() {
  const body = document.body
  if (!body || !body.classList.contains('view-agreement-has-watermark')) return

  body.classList.add('print-active')

  // Mark any existing print-watermark as stale and create a fresh one
  const existing = document.querySelectorAll('.print-watermark')
  existing.forEach((el) => el.classList.add('print-watermark--stale'))

  // Create a fresh node to defeat preview caching
  const fresh = document.createElement('div')
  fresh.className = 'print-watermark'
  fresh.setAttribute('aria-hidden', 'true')
  // Inject a nonce so Chrome treats it as a new layer each time
  const nonce = Date.now()
  fresh.dataset.nonce = String(nonce)
  // Vary the text node invisibly to defeat Chrome print preview caching
  const zwj = '\u200D'.repeat((nonce % 7) + 1) // zero-width joiners, invisible
  fresh.textContent = `DRAFT${zwj} AGREEMENT`
  body.appendChild(fresh)

  // Force reflow to ensure layout picks up new node
  void fresh.offsetHeight // eslint-disable-line no-unused-expressions
}

function deactivatePrintState() {
  document.body?.classList.remove('print-active')
  // Clean up all dynamically created watermark nodes (fresh and stale)
  const nodes = document.querySelectorAll('.print-watermark, .print-watermark--stale')
  nodes.forEach((el) => el.remove())
}

document.addEventListener('DOMContentLoaded', () => {
  // Toggle print state around print events
  if ('onbeforeprint' in window) {
    window.addEventListener('beforeprint', activatePrintState)
  }
  if ('onafterprint' in window) {
    window.addEventListener('afterprint', deactivatePrintState)
  }

  // Also handle browsers that signal print via matchMedia
  const mql = window.matchMedia('print')
  const onChange = (e) => {
    if (e.matches) activatePrintState()
    else deactivatePrintState()
  }
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', onChange)
  } else if (typeof mql.addListener === 'function') {
    mql.addListener(onChange)
  }

  const btn = document.querySelector('.gem-c-print-link__button')
  if (btn) {
    btn.type = 'button'
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      activatePrintState()
      // Allow styles/DOM to flush before opening the print dialog
      setTimeout(() => window.print())
    })
  }
})

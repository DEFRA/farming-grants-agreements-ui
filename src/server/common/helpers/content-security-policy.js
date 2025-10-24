import Blankie from 'blankie'

/**
 * Manage content security policies.
 * @satisfies {import('@hapi/hapi').Plugin}
 */
// Keep the same options object so we can use it both for Blankie and for error responses
const options = {
  // Hash 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' is to support a GOV.UK frontend script bundled within Nunjucks macros
  // https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy
  defaultSrc: ['self'],
  fontSrc: ['self', 'data:'],
  connectSrc: ['self', 'wss', 'data:'],
  mediaSrc: ['self'],
  styleSrc: ['self', 'unsafe-inline'],
  scriptSrc: ['self', "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"],
  imgSrc: ['self', 'data:'],
  frameSrc: ['self', 'data:'],
  objectSrc: ['none'],
  frameAncestors: ['none'],
  formAction: ['self'],
  manifestSrc: ['self'],
  generateNonces: false
}

// Helper to build a Content-Security-Policy header string from the options above
const directiveMap = {
  defaultSrc: 'default-src',
  fontSrc: 'font-src',
  connectSrc: 'connect-src',
  mediaSrc: 'media-src',
  styleSrc: 'style-src',
  scriptSrc: 'script-src',
  imgSrc: 'img-src',
  frameSrc: 'frame-src',
  objectSrc: 'object-src',
  frameAncestors: 'frame-ancestors',
  formAction: 'form-action',
  manifestSrc: 'manifest-src'
}

function buildCspHeader(opts) {
  return Object.keys(directiveMap)
    .map((key) => {
      const value = opts[key]
      if (!value) {
        return null
      }
      const directive = directiveMap[key]
      const vals = Array.isArray(value) ? value.join(' ') : String(value)
      return `${directive} ${vals}`
    })
    .filter(Boolean)
    .join('; ')
}

// Export a Hapi plugin that registers Blankie and ensures the header is set for Boom errors
const contentSecurityPolicy = {
  name: 'content-security-policy-wrapper',
  register: async (server) => {
    // register Blankie normally for non-error responses (it will handle non-Boom responses)
    await server.register({ plugin: Blankie, options })

    // Pre-build header once
    const header = buildCspHeader(options)

    // Ensure Boom error responses get the same CSP header
    server.ext('onPreResponse', (request, h) => {
      const response = request.response
      if (response?.isBoom) {
        // Boom responses expose headers on response.output.headers
        response.output = response.output || {}
        response.output.headers = response.output.headers || {}
        // don't override if already set
        if (!response.output.headers['content-security-policy']) {
          response.output.headers['content-security-policy'] = header
        }
      }
      return h.continue
    })
  }
}

export { contentSecurityPolicy }

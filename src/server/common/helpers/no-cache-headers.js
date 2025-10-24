/**
 * Manage content security policies.
 * @satisfies {import('@hapi/hapi').Plugin}
 */
export const noCacheHeaders = {
  name: 'noCacheHeaders',
  register: async function (server) {
    server.ext('onPreResponse', (request, h) => {
      const response = request.response

      // Check if response is a Boom error or regular response
      if (response.isBoom) {
        response.output.headers['Cache-Control'] =
          'no-store, no-cache, must-revalidate, proxy-revalidate'
        response.output.headers['Pragma'] = 'no-cache'
        response.output.headers['Expires'] = '0'
        response.output.headers['Surrogate-Control'] = 'no-store'
      } else {
        response.header(
          'Cache-Control',
          'no-store, no-cache, must-revalidate, proxy-revalidate'
        )
        response.header('Pragma', 'no-cache')
        response.header('Expires', '0')
        response.header('Surrogate-Control', 'no-store')
      }

      return h.continue
    })
  }
}

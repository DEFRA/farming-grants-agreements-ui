import { statusCodes } from '../constants/status-codes.js'

function statusCodeMessage(statusCode) {
  switch (statusCode) {
    case statusCodes.notFound:
      return 'Page not found'
    case statusCodes.forbidden:
      return 'Forbidden'
    case statusCodes.unauthorized:
      return 'Unauthorized'
    case statusCodes.badRequest:
      return 'Bad Request'
    default:
      return 'Something went wrong'
  }
}

export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  } else {
    request.server.logger.info(response)
  }

  const templateData = {
    errorMessage: response.message || statusCodeMessage(statusCode)
  }

  let template = 'error/index.njk'

  if (response.output.statusCode === statusCodes.unauthorized) {
    template = 'error/unauthorized.njk'
  }

  if (response.output.statusCode === statusCodes.notFound) {
    template = 'error/not-found.njk'
  }

  return h
    .view(template, templateData)
    .code(response.output.statusCode)
    .header(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    .header('Pragma', 'no-cache')
    .header('Expires', '0')
    .header('Surrogate-Control', 'no-store')
}

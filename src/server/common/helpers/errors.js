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

export const catchAll = (request, h) => {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode

  request.logger[
    statusCode >= statusCodes.internalServerError ? 'error' : 'info'
  ](response)

  const templateData = {
    errorMessage: response.message || statusCodeMessage(statusCode),
    cause: response.cause?.code
  }

  let template = 'error/index.njk'

  if (response.output.statusCode === statusCodes.unauthorized) {
    template = 'error/unauthorized.njk'
  }

  if (response.output.statusCode === statusCodes.notFound) {
    template = 'error/not-found.njk'
  }

  return h.view(template, templateData).code(response.output.statusCode)
}

export const errorHandler = {
  name: 'errorHandler',
  register: async function (server) {
    server.ext('onPreResponse', catchAll)
  }
}

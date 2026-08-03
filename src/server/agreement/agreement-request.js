export const encryptedAuthQueryName = 'x-encrypted-auth'

export const getAgreementAuthentication = (request) =>
  request.headers?.[encryptedAuthQueryName] ||
  request.query?.[encryptedAuthQueryName]

export const getQueryAuthentication = (request) =>
  request.headers?.[encryptedAuthQueryName]
    ? undefined
    : request.query?.[encryptedAuthQueryName]

export const getGasQueryParams = (request) =>
  Object.fromEntries(
    Object.entries(request.query ?? {}).filter(
      ([name]) => name !== encryptedAuthQueryName
    )
  )

export const encryptedAuthQueryName = 'x-encrypted-auth'

// TODO (FGP-1307): stop accepting the caller token from the query string and
// only accept it from the header. Query-string tokens leak into logs, browser
// history and the Referer header. Left in place for now for backwards
// compatibility; remove the request.query fallback below once all callers send
// the token as a header.
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

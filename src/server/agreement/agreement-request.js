export const encryptedAuthQueryName = 'x-encrypted-auth'

// FGP-1394: the caller token header is being renamed from 'x-encrypted-auth' to
// 'x-user-context' (it carries a signed, not encrypted, value). Accept the new
// name first, falling back to the old one, so producers can migrate independently.
const userContextHeaderName = 'x-user-context'

// FGP-1307: the caller token is verified from the request header ONLY. Query-string
// tokens leak into logs, browser history and the Referer header, so they are no
// longer accepted as caller identity. (URL emission of the token for the legacy
// header-less path is retained for now and removed in a follow-up.)
export const getAgreementAuthentication = (request) =>
  request.headers?.[userContextHeaderName] ??
  request.headers?.[encryptedAuthQueryName]

export const getQueryAuthentication = (request) =>
  request.headers?.[userContextHeaderName] ||
  request.headers?.[encryptedAuthQueryName]
    ? undefined
    : request.query?.[encryptedAuthQueryName]

export const getGasQueryParams = (request) =>
  Object.fromEntries(
    Object.entries(request.query ?? {}).filter(
      ([name]) => name !== encryptedAuthQueryName
    )
  )
